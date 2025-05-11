import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Keypair } from "@solana/web3.js"
import { Program, AnchorProvider, BN, type Idl } from "@project-serum/anchor"
import idl from "../idl/bytebonds.json"

// Production Program ID - using the exact ID you provided
export const PROGRAM_ID = new PublicKey("9Dv2v4Lhcndjv5Mtq3A3m5xZi5JwQkUg3qh9MKT5nqpP")

// Define repayment types for UI purposes only (not used in the actual program)
export enum RepaymentType {
  LumpSum = 0,
  Installments = 1,
}

// Get connection to Solana devnet
export const getConnection = () => {
  return new Connection("https://api.devnet.solana.com", "confirmed")
}

// Get the Anchor program instance
export const getProgram = async (wallet: any) => {
  const connection = getConnection()

  // Create an Anchor provider with specific options
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "processed",
    commitment: "processed",
  })

  try {
    // Create the program instance using the imported IDL
    return new Program(idl as Idl, PROGRAM_ID, provider)
  } catch (error) {
    console.error("Error getting program:", error)
    throw error
  }
}

// Find PDA for bond account
export const findBondPDA = async (freelancerPublicKey: PublicKey, bondSeed: number) => {
  try {
    const [bondPDA, bump] = await PublicKey.findProgramAddress(
      [Buffer.from("bond"), freelancerPublicKey.toBuffer(), new BN(bondSeed).toArrayLike(Buffer, "le", 8)],
      PROGRAM_ID,
    )

    return { bondPDA, bump }
  } catch (error) {
    console.error("Error finding bond PDA:", error)
    throw error
  }
}

// Create a bond
export const createBond = async ({
  amount,
  duration,
  interestRate,
  incomeProof,
  description,
  repaymentType, // This parameter is ignored in the actual program call
}: {
  amount: number
  duration: number
  interestRate: number
  incomeProof: string
  description: string
  repaymentType: RepaymentType
}) => {
  try {
    // Check if window.solana exists
    if (!(window as any).solana) {
      throw new Error("Phantom wallet not found. Please install the Phantom wallet extension.")
    }

    // Get the wallet public key
    const publicKey = (window as any).solana?.publicKey
    if (!publicKey) {
      throw new Error("Wallet public key not found. Please connect your wallet.")
    }

    console.log("Creating bond with parameters:", {
      amount,
      duration,
      interestRate,
      incomeProof,
      description,
      // repaymentType is not used in the actual program
    })

    // Convert amount to lamports (SOL's smallest unit)
    const amountLamports = new BN(amount * LAMPORTS_PER_SOL)

    // Generate a bond seed (current timestamp)
    const bondSeed = Date.now()
    console.log("Generated bond seed:", bondSeed)

    // Find the PDA for this bond
    const { bondPDA, bump } = await findBondPDA(publicKey, bondSeed)
    console.log("Generated bond PDA:", bondPDA.toString(), "with bump:", bump)

    // Get the connection
    const connection = getConnection()

    // Create a wallet adapter for Anchor
    const wallet = {
      publicKey: publicKey,
      signTransaction: async (tx: Transaction) => {
        if (!(window as any).solana?.signTransaction) {
          throw new Error("Wallet does not support signTransaction")
        }
        return (window as any).solana.signTransaction(tx)
      },
      signAllTransactions: async (txs: Transaction[]) => {
        if (!(window as any).solana?.signAllTransactions) {
          throw new Error("Wallet does not support signAllTransactions")
        }
        return (window as any).solana.signAllTransactions(txs)
      },
    }

    // Get the program
    const program = await getProgram(wallet)

    // Create a new transaction
    const transaction = new Transaction()

    // Add the create bond instruction - note we're not passing repaymentType
    transaction.add(
      program.instruction.createBond(
        new BN(bondSeed),
        amountLamports,
        duration,
        interestRate,
        incomeProof.substring(0, 200), // Limit string length
        description.substring(0, 500), // Limit string length
        {
          accounts: {
            freelancer: publicKey,
            bond: bondPDA,
            systemProgram: SystemProgram.programId,
          },
        },
      ),
    )

    console.log("Transaction created with instructions:", transaction.instructions.length)

    return {
      transaction,
      signers: [],
      bondId: bondPDA.toString(),
      bondSeed,
    }
  } catch (error) {
    console.error("Error creating bond:", error)
    throw error
  }
}

// Define the Investment layout
const Investment = {
  SPACE: 32 + 32 + 8 + 8 + 32, // investor + bond + amount + createdAt + padding
}

// Invest in a bond
export const investInBond = async (bondId: string, amount: number) => {
  try {
    // Check if window.solana exists
    if (!(window as any).solana) {
      throw new Error("Phantom wallet not found. Please install the Phantom wallet extension.")
    }

    // Get the wallet public key
    const publicKey = (window as any).solana?.publicKey
    if (!publicKey) {
      throw new Error("Wallet public key not found. Please connect your wallet.")
    }

    console.log(`Investing ${amount} SOL in bond ${bondId}`)

    // Convert amount to lamports
    const amountLamports = new BN(amount * LAMPORTS_PER_SOL)

    // Get the connection
    const connection = getConnection()

    // Create a wallet adapter for Anchor
    const wallet = {
      publicKey: publicKey,
      signTransaction: async (tx: Transaction) => {
        if (!(window as any).solana?.signTransaction) {
          throw new Error("Wallet does not support signTransaction")
        }
        return (window as any).solana.signTransaction(tx)
      },
      signAllTransactions: async (txs: Transaction[]) => {
        if (!(window as any).solana?.signAllTransactions) {
          throw new Error("Wallet does not support signAllTransactions")
        }
        return (window as any).solana.signAllTransactions(txs)
      },
    }

    // Get the program
    const program = await getProgram(wallet)

    // Get the bond account
    const bondPublicKey = new PublicKey(bondId)
    console.log("Fetching bond account:", bondPublicKey.toString())

    const bond = await program.account.bond.fetch(bondPublicKey)
    console.log("Bond account fetched:", {
      freelancer: bond.freelancer.toString(),
      amount: bond.amount.toString(),
      funded: bond.funded.toString(),
      status: JSON.stringify(bond.status),
    })

    // Check if bond is still open
    if (!bond.status.open) {
      throw new Error("This bond is no longer open for investment")
    }

    // Check if investment would exceed the bond amount
    const remainingAmountNeeded = bond.amount.toNumber() - bond.funded.toNumber()
    if (amountLamports.toNumber() > remainingAmountNeeded) {
      throw new Error(
        `Investment amount exceeds the remaining amount needed (${remainingAmountNeeded / LAMPORTS_PER_SOL} SOL)`,
      )
    }

    // Generate a new keypair for the investment account
    const investmentKeypair = Keypair.generate()
    console.log("Generated investment keypair:", investmentKeypair.publicKey.toString())

    // Calculate rent exemption for the investment account
    const rentExemption = await connection.getMinimumBalanceForRentExemption(8 + Investment.SPACE)

    // Use the program methods directly with rpc()
    console.log("Creating investment transaction using Anchor program methods...")

    // First create the investment account
    const createAccountIx = SystemProgram.createAccount({
      fromPubkey: publicKey,
      newAccountPubkey: investmentKeypair.publicKey,
      lamports: rentExemption,
      space: 8 + Investment.SPACE,
      programId: PROGRAM_ID,
    })

    // Send the create account transaction first
    const createAccountTx = new Transaction().add(createAccountIx)
    const { blockhash } = await connection.getLatestBlockhash("confirmed")
    createAccountTx.recentBlockhash = blockhash
    createAccountTx.feePayer = publicKey
    createAccountTx.partialSign(investmentKeypair)

    // Now use the program methods for the invest instruction
    console.log(`Preparing invest instruction with amount: ${amountLamports.toString()}`)

    // Use the program methods directly with rpc()
    const txid = await program.methods
      .invest(amountLamports)
      .accounts({
        investor: publicKey,
        bond: bondPublicKey,
        freelancerAccount: bond.freelancer,
        investment: investmentKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([investmentKeypair]) // Phantom will sign automatically
      .preInstructions([createAccountIx]) // Include the create account instruction
      .rpc()

    console.log("Investment transaction sent with signature:", txid)

    return {
      signature: txid,
      investmentId: investmentKeypair.publicKey.toString(),
    }
  } catch (error) {
    console.error("Error investing in bond:", error)
    throw error
  }
}

// Make a repayment
export const makeRepayment = async (repaymentId: string, amount: number) => {
  try {
    // Check if window.solana exists
    if (!(window as any).solana) {
      throw new Error("Phantom wallet not found. Please install the Phantom wallet extension.")
    }

    // Get the wallet public key
    const publicKey = (window as any).solana?.publicKey
    if (!publicKey) {
      throw new Error("Wallet public key not found. Please connect your wallet.")
    }

    console.log(`Making repayment for repayment ${repaymentId} with amount ${amount}`)

    // Get the connection
    const connection = getConnection()

    // Create a wallet adapter for Anchor
    const wallet = {
      publicKey: publicKey,
      signTransaction: async (tx: Transaction) => {
        if (!(window as any).solana?.signTransaction) {
          throw new Error("Wallet does not support signTransaction")
        }
        return (window as any).solana.signTransaction(tx)
      },
      signAllTransactions: async (txs: Transaction[]) => {
        if (!(window as any).solana?.signAllTransactions) {
          throw new Error("Wallet does not support signAllTransactions")
        }
        return (window as any).solana.signAllTransactions(txs)
      },
    }

    // Get the program
    const program = await getProgram(wallet)

    // Get the repayment account
    const repaymentPublicKey = new PublicKey(repaymentId)
    const repayment = await program.account.repayment.fetch(repaymentPublicKey)

    // Convert amount to lamports
    const amountLamports = new BN(amount * LAMPORTS_PER_SOL)

    // Create a new transaction
    const transaction = new Transaction()

    // Add the makeRepayment instruction
    transaction.add(
      program.instruction.makeRepayment(new BN(repayment.installmentNumber || 1), amountLamports, {
        accounts: {
          freelancer: publicKey,
          bond: repayment.bond,
          repayment: repaymentPublicKey,
          investorAccount: repayment.investor,
          systemProgram: SystemProgram.programId,
        },
      }),
    )

    console.log("Repayment transaction created")

    return {
      transaction,
      signers: [],
    }
  } catch (error) {
    console.error("Error making repayment:", error)
    throw error
  }
}

// Make a lump sum repayment
export const makeLumpSumRepayment = async (bondId: string, investmentId: string) => {
  try {
    // Check if window.solana exists
    if (!(window as any).solana) {
      throw new Error("Phantom wallet not found. Please install the Phantom wallet extension.")
    }

    // Get the wallet public key
    const publicKey = (window as any).solana?.publicKey
    if (!publicKey) {
      throw new Error("Wallet public key not found. Please connect your wallet.")
    }

    console.log(`Making lump sum repayment for bond ${bondId} and investment ${investmentId}`)

    // Get the connection
    const connection = getConnection()

    // Create a wallet adapter for Anchor
    const wallet = {
      publicKey: publicKey,
      signTransaction: async (tx: Transaction) => {
        if (!(window as any).solana?.signTransaction) {
          throw new Error("Wallet does not support signTransaction")
        }
        return (window as any).solana.signTransaction(tx)
      },
      signAllTransactions: async (txs: Transaction[]) => {
        if (!(window as any).solana?.signAllTransactions) {
          throw new Error("Wallet does not support signAllTransactions")
        }
        return (window as any).solana.signAllTransactions(txs)
      },
    }

    // Get the program
    const program = await getProgram(wallet)

    // Get the bond and investment accounts
    const bondPublicKey = new PublicKey(bondId)
    const investmentPublicKey = new PublicKey(investmentId)

    // Fetch the bond and investment data
    const bond = await program.account.bond.fetch(bondPublicKey)
    const investment = await program.account.investment.fetch(investmentPublicKey)

    // Use the program methods directly with rpc()
    console.log("Creating lump sum repayment transaction using Anchor program methods...")

    const txid = await program.methods
      .makeLumpSumRepayment()
      .accounts({
        freelancer: publicKey,
        bond: bondPublicKey,
        investment: investmentPublicKey,
        investorAccount: investment.investor,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    console.log("Lump sum repayment transaction sent with signature:", txid)

    return {
      signature: txid,
    }
  } catch (error) {
    console.error("Error making lump sum repayment:", error)
    throw error
  }
}

// Create a repayment plan with installments
export const createRepaymentPlan = async (bondId: string, installments: number) => {
  try {
    // Check if window.solana exists
    if (!(window as any).solana) {
      throw new Error("Phantom wallet not found. Please install the Phantom wallet extension.")
    }

    // Get the wallet public key
    const publicKey = (window as any).solana?.publicKey
    if (!publicKey) {
      throw new Error("Wallet public key not found. Please connect your wallet.")
    }

    console.log(`Creating repayment plan for bond ${bondId} with ${installments} installments`)

    // Get the connection
    const connection = getConnection()

    // Create a wallet adapter for Anchor
    const wallet = {
      publicKey: publicKey,
      signTransaction: async (tx: Transaction) => {
        if (!(window as any).solana?.signTransaction) {
          throw new Error("Wallet does not support signTransaction")
        }
        return (window as any).solana.signTransaction(tx)
      },
      signAllTransactions: async (txs: Transaction[]) => {
        if (!(window as any).solana?.signAllTransactions) {
          throw new Error("Wallet does not support signAllTransactions")
        }
        return (window as any).solana.signAllTransactions(txs)
      },
    }

    // Get the program
    const program = await getProgram(wallet)

    // Get the bond account
    const bondPublicKey = new PublicKey(bondId)

    // Create a new transaction
    const transaction = new Transaction()

    // Add the createRepaymentPlan instruction
    transaction.add(
      program.instruction.createRepaymentPlan(installments, {
        accounts: {
          freelancer: publicKey,
          bond: bondPublicKey,
          systemProgram: SystemProgram.programId,
        },
      }),
    )

    console.log("Repayment plan transaction created")

    return {
      transaction,
      signers: [],
    }
  } catch (error) {
    console.error("Error creating repayment plan:", error)
    throw error
  }
}

// Make an installment payment
export const makeInstallmentRepayment = async (repaymentId: string, amount: number) => {
  try {
    // Check if window.solana exists
    if (!(window as any).solana) {
      throw new Error("Phantom wallet not found. Please install the Phantom wallet extension.")
    }

    // Get the wallet public key
    const publicKey = (window as any).solana?.publicKey
    if (!publicKey) {
      throw new Error("Wallet public key not found. Please connect your wallet.")
    }

    console.log(`Making installment payment for repayment ${repaymentId} with amount ${amount}`)

    // Get the connection
    const connection = getConnection()

    // Create a wallet adapter for Anchor
    const wallet = {
      publicKey: publicKey,
      signTransaction: async (tx: Transaction) => {
        if (!(window as any).solana?.signTransaction) {
          throw new Error("Wallet does not support signTransaction")
        }
        return (window as any).solana.signTransaction(tx)
      },
      signAllTransactions: async (txs: Transaction[]) => {
        if (!(window as any).solana?.signAllTransactions) {
          throw new Error("Wallet does not support signAllTransactions")
        }
        return (window as any).solana.signAllTransactions(txs)
      },
    }

    // Get the program
    const program = await getProgram(wallet)

    // Get the repayment account
    const repaymentPublicKey = new PublicKey(repaymentId)
    const repayment = await program.account.repayment.fetch(repaymentPublicKey)

    // Convert amount to lamports
    const amountLamports = new BN(amount * LAMPORTS_PER_SOL)

    // Create a new transaction
    const transaction = new Transaction()

    // Add the makeRepayment instruction
    transaction.add(
      program.instruction.makeRepayment(new BN(repayment.installmentNumber), amountLamports, {
        accounts: {
          freelancer: publicKey,
          bond: repayment.bond,
          repayment: repaymentPublicKey,
          investorAccount: repayment.investor,
          systemProgram: SystemProgram.programId,
        },
      }),
    )

    console.log("Installment payment transaction created")

    return {
      transaction,
      signers: [],
    }
  } catch (error) {
    console.error("Error making installment payment:", error)
    throw error
  }
}

// Fetch bonds
export const fetchBonds = async (userType: "freelancer" | "investor", walletAddress?: string) => {
  if (!walletAddress) {
    return []
  }

  console.log(`Fetching bonds for ${userType} with wallet ${walletAddress}`)

  // Add a delay to ensure the blockchain has time to update
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Use a higher commitment level for more reliable data
  const connection = new Connection("https://api.devnet.solana.com", "confirmed")

  // Create a wallet adapter for Anchor
  const wallet = {
    publicKey: new PublicKey(walletAddress),
    signTransaction: async (tx: Transaction) => tx,
    signAllTransactions: async (txs: Transaction[]) => txs,
  }

  // Get the program
  const program = await getProgram(wallet)

  try {
    // Get all program accounts of type Bond
    console.log("Fetching all bond accounts...")

    // Use a more targeted approach for fetching bonds
    let bondAccounts = []

    if (userType === "freelancer") {
      // Only fetch bonds created by this freelancer
      bondAccounts = await program.account.bond.all([
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: wallet.publicKey.toBase58(),
          },
        },
      ])
      console.log(`Found ${bondAccounts.length} bonds for freelancer ${walletAddress}`)
    } else {
      // For investors, fetch all bonds
      bondAccounts = await program.account.bond.all()
      console.log(`Found ${bondAccounts.length} total bonds`)
    }

    // Filter based on user type
    const filteredBonds = bondAccounts.filter((account) => {
      if (userType === "freelancer") {
        return true // Already filtered by memcmp
      } else {
        // For investors, show all open bonds
        const isOpen = account.account.status.open !== undefined
        console.log(
          `Bond ${account.publicKey.toString()} status: ${JSON.stringify(account.account.status)}, is open: ${isOpen}`,
        )
        return isOpen
      }
    })

    console.log(`Filtered to ${filteredBonds.length} bonds for ${userType}`)

    // Map to the expected format
    return filteredBonds.map((account) => {
      const bond = account.account
      return {
        id: account.publicKey.toString(),
        freelancer: bond.freelancer.toString(),
        amount: bond.amount.toNumber() / LAMPORTS_PER_SOL,
        duration: bond.duration,
        interestRate: bond.interest_rate || bond.interestRate, // Handle both naming conventions
        funded: bond.funded.toNumber() / LAMPORTS_PER_SOL,
        status: bond.status.open
          ? "open"
          : bond.status.funded
            ? "funded"
            : bond.status.repaying
              ? "repaying"
              : "completed",
        description: bond.description,
        createdAt: bond.created_at ? bond.created_at.toNumber() * 1000 : bond.createdAt.toNumber() * 1000, // Convert to JS timestamp
        bondSeed: bond.bond_seed ? bond.bond_seed.toNumber() : bond.bondSeed?.toNumber(),
        bump: bond.bump,
        // Default to LumpSum for UI purposes since the actual program doesn't have repaymentType
        repaymentType: RepaymentType.LumpSum,
        installments: 0,
      }
    })
  } catch (error) {
    console.error("Error fetching bond accounts:", error)

    // Try a different approach if the first one fails
    try {
      console.log("Trying alternative approach to fetch bonds...")
      const allBonds = await program.account.bond.all()
      console.log(`Found ${allBonds.length} total bonds with alternative approach`)

      // Filter manually
      const filteredBonds = allBonds.filter((account) => {
        if (userType === "freelancer") {
          const matches = account.account.freelancer.toString() === walletAddress
          return matches
        } else {
          // For investors, show all open bonds
          return account.account.status.open !== undefined
        }
      })

      console.log(`Filtered to ${filteredBonds.length} bonds for ${userType} with alternative approach`)

      return filteredBonds.map((account) => {
        const bond = account.account
        return {
          id: account.publicKey.toString(),
          freelancer: bond.freelancer.toString(),
          amount: bond.amount.toNumber() / LAMPORTS_PER_SOL,
          duration: bond.duration,
          interestRate: bond.interest_rate || bond.interestRate, // Handle both naming conventions
          funded: bond.funded.toNumber() / LAMPORTS_PER_SOL,
          status: bond.status.open
            ? "open"
            : bond.status.funded
              ? "funded"
              : bond.status.repaying
                ? "repaying"
                : "completed",
          description: bond.description,
          createdAt: bond.created_at ? bond.created_at.toNumber() * 1000 : bond.createdAt.toNumber() * 1000, // Convert to JS timestamp
          bondSeed: bond.bond_seed ? bond.bond_seed.toNumber() : bond.bondSeed?.toNumber(),
          bump: bond.bump,
          // Default to LumpSum for UI purposes
          repaymentType: RepaymentType.LumpSum,
          installments: 0,
        }
      })
    } catch (secondError) {
      console.error("Alternative approach also failed:", secondError)
      return []
    }
  }
}

// Helper function to extract repayment type from bond account
function getRepaymentTypeFromBond(bond: any): RepaymentType {
  if (bond.repaymentType) {
    if (bond.repaymentType.lumpSum !== undefined) {
      return RepaymentType.LumpSum
    } else if (bond.repaymentType.installments !== undefined) {
      return RepaymentType.Installments
    }
  }
  // Default to LumpSum if not specified
  return RepaymentType.LumpSum
}

// Fetch investments
export const fetchInvestments = async (walletAddress?: string) => {
  if (!walletAddress) {
    return []
  }

  console.log(`Fetching investments for wallet ${walletAddress}`)

  // Fetch real data
  const connection = getConnection()

  // Create a wallet adapter for Anchor
  const wallet = {
    publicKey: new PublicKey(walletAddress),
    signTransaction: async (tx: Transaction) => tx,
    signAllTransactions: async (txs: Transaction[]) => txs,
  }

  // Get the program
  const program = await getProgram(wallet)

  try {
    // Get all program accounts of type Investment
    console.log("Fetching investment accounts...")
    const investmentAccounts = await program.account.investment.all([
      {
        memcmp: {
          offset: 8, // After discriminator
          bytes: wallet.publicKey.toBase58(),
        },
      },
    ])
    console.log(`Found ${investmentAccounts.length} investments`)

    // Map to the expected format with additional bond data
    const investments = await Promise.all(
      investmentAccounts.map(async (account) => {
        const investment = account.account
        console.log(`Processing investment ${account.publicKey.toString()}`)

        try {
          // Fetch the associated bond
          console.log(`Fetching bond ${investment.bond.toString()}`)
          const bondData = await program.account.bond.fetch(investment.bond)

          // Fetch repayments for this investment
          console.log(`Fetching repayments for bond ${investment.bond.toString()}`)
          const repaymentAccounts = await program.account.repayment.all([
            {
              memcmp: {
                offset: 8, // After discriminator
                bytes: investment.bond.toBase58(),
              },
            },
          ])
          console.log(`Found ${repaymentAccounts.length} repayments for this bond`)

          const repaidAmount =
            repaymentAccounts
              .filter((r) => r.account.status.paid !== undefined && r.account.investor.toString() === walletAddress)
              .reduce((sum, r) => sum + r.account.amount.toNumber(), 0) / LAMPORTS_PER_SOL

          // Find the next payment date
          const pendingRepayments = repaymentAccounts
            .filter((r) => r.account.status.pending !== undefined && r.account.investor.toString() === walletAddress)
            .sort((a, b) => a.account.dueDate.toNumber() - b.account.dueDate.toNumber())

          const nextPaymentDate =
            pendingRepayments.length > 0
              ? pendingRepayments[0].account.dueDate.toNumber() * 1000
              : Date.now() + 30 * 24 * 60 * 60 * 1000 // Default to 30 days from now

          return {
            id: account.publicKey.toString(),
            bondId: investment.bond.toString(),
            freelancer: bondData.freelancer.toString(),
            amount: bondData.amount.toNumber() / LAMPORTS_PER_SOL,
            investedAmount: investment.amount.toNumber() / LAMPORTS_PER_SOL,
            duration: bondData.duration,
            interestRate: bondData.interestRate,
            status: bondData.status.completed ? "completed" : "active",
            repaidAmount,
            nextPaymentDate,
            description: bondData.description,
            createdAt: investment.createdAt.toNumber() * 1000,
            // Default to LumpSum for UI purposes
            repaymentType: RepaymentType.LumpSum,
            installments: 0,
          }
        } catch (error) {
          console.error(`Error processing investment ${account.publicKey.toString()}:`, error)
          // Return a placeholder for this investment
          return {
            id: account.publicKey.toString(),
            bondId: investment.bond.toString(),
            freelancer: "Unknown",
            amount: 0,
            investedAmount: investment.amount.toNumber() / LAMPORTS_PER_SOL,
            duration: 0,
            interestRate: 0,
            status: "active",
            repaidAmount: 0,
            nextPaymentDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
            description: "Error loading bond details",
            createdAt: investment.createdAt.toNumber() * 1000,
            repaymentType: RepaymentType.LumpSum,
            installments: 0,
          }
        }
      }),
    )

    return investments
  } catch (error) {
    console.error("Error fetching investment accounts:", error)
    return []
  }
}

// Fetch repayments
export const fetchRepayments = async (walletAddress?: string) => {
  if (!walletAddress) {
    return []
  }

  console.log(`Fetching repayments for wallet ${walletAddress}`)

  // Fetch real data
  const connection = getConnection()

  // Create a wallet adapter for Anchor
  const wallet = {
    publicKey: new PublicKey(walletAddress),
    signTransaction: async (tx: Transaction) => tx,
    signAllTransactions: async (txs: Transaction[]) => txs,
  }

  // Get the program
  const program = await getProgram(wallet)

  try {
    // Get all bonds created by this freelancer
    console.log("Fetching bonds created by this freelancer...")
    const bondAccounts = await program.account.bond.all([
      {
        memcmp: {
          offset: 8, // After discriminator
          bytes: wallet.publicKey.toBase58(),
        },
      },
    ])
    console.log(`Found ${bondAccounts.length} bonds created by this freelancer`)

    // Get all repayments for these bonds
    const repayments = []
    for (const bondAccount of bondAccounts) {
      console.log(`Fetching repayments for bond ${bondAccount.publicKey.toString()}`)
      try {
        const repaymentAccounts = await program.account.repayment.all([
          {
            memcmp: {
              offset: 8, // After discriminator
              bytes: bondAccount.publicKey.toBase58(),
            },
          },
        ])
        console.log(`Found ${repaymentAccounts.length} repayments for this bond`)

        for (const repaymentAccount of repaymentAccounts) {
          const repayment = repaymentAccount.account

          // Determine status
          let status: "pending" | "paid" | "overdue" = "pending"
          if (repayment.status.paid !== undefined) {
            status = "paid"
          } else if (repayment.dueDate.toNumber() * 1000 < Date.now()) {
            status = "overdue"
          }

          repayments.push({
            id: repaymentAccount.publicKey.toString(),
            bondId: bondAccount.publicKey.toString(),
            amount: repayment.amount.toNumber() / LAMPORTS_PER_SOL,
            dueDate: repayment.dueDate.toNumber() * 1000,
            status,
            createdAt: repayment.createdAt.toNumber() * 1000,
            installmentNumber: 1, // Default to 1 since the actual program doesn't have installmentNumber
            isInstallment: false, // Default to false since the actual program doesn't have repaymentType
          })
        }
      } catch (error) {
        console.error(`Error fetching repayments for bond ${bondAccount.publicKey.toString()}:`, error)
      }
    }

    return repayments
  } catch (error) {
    console.error("Error fetching bond accounts:", error)
    return []
  }
}

// Test connection to the program
export const testProgramConnection = async () => {
  try {
    // Check actual connection
    const connection = getConnection()
    console.log("Connecting to Solana devnet...")

    // Check if the program exists
    const programInfo = await connection.getAccountInfo(PROGRAM_ID)

    if (programInfo) {
      console.log("Program found on devnet!")
      console.log("Program size:", programInfo.data.length, "bytes")
      return true
    } else {
      console.error("Program not found on devnet. Check the Program ID.")
      return false
    }
  } catch (error) {
    console.error("Error testing program connection:", error)
    return false
  }
}

// Debug wallet connection
export const debugWalletConnection = async () => {
  try {
    // Check if window.solana exists
    if (!(window as any).solana) {
      console.error("Phantom wallet not found")
      return { success: false, error: "Phantom wallet not found" }
    }

    const walletInfo = {
      isPhantom: (window as any).solana?.isPhantom,
      publicKey: (window as any).solana?.publicKey?.toString(),
      isConnected: (window as any).solana?.isConnected,
      autoApprove: (window as any).solana?.autoApprove,
      supportedTransactionVersions: (window as any).solana?.supportedTransactionVersions,
    }

    console.log("Wallet info:", walletInfo)

    // Send the data to our API for server-side logging
    try {
      await fetch("/api/debug-wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(walletInfo),
      })
    } catch (fetchError) {
      console.error("Error sending debug data:", fetchError)
    }

    return { success: true, data: walletInfo }
  } catch (error) {
    console.error("Error debugging wallet:", error)
    return { success: false, error: String(error) }
  }
}
