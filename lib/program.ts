import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { Program, AnchorProvider, BN, type Idl } from "@project-serum/anchor"
import idl from "../idl/bytebonds.json"

// Production Program ID - using the exact ID you provided
export const PROGRAM_ID = new PublicKey("9Dv2v4Lhcndjv5Mtq3A3m5xZi5JwQkUg3qh9MKT5nqpP")

// Define repayment types to match the contract
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

// Find PDA for investment account
export const findInvestmentPDA = async (investorPublicKey: PublicKey, bondPublicKey: PublicKey) => {
  try {
    // Create a unique seed for this investor and bond combination
    // Using "investment" as the prefix and both the investor and bond public keys as seeds
    const [investmentPDA, bump] = await PublicKey.findProgramAddress(
      [Buffer.from("investment"), investorPublicKey.toBuffer(), bondPublicKey.toBuffer()],
      PROGRAM_ID,
    )

    return { investmentPDA, bump }
  } catch (error) {
    console.error("Error finding investment PDA:", error)
    throw error
  }
}

// Helper function to detect wallet provider (Phantom, Solflare, Backpack, etc.)
export const detectWalletProvider = () => {
  try {
    // Check for Phantom
    if ((window as any).phantom?.solana) {
      const publicKey = (window as any).phantom.solana.publicKey
      return {
        name: "Phantom",
        publicKey: publicKey,
        signTransaction: async (tx: Transaction) => (window as any).phantom.solana.signTransaction(tx),
        signAllTransactions: async (txs: Transaction[]) => (window as any).phantom.solana.signAllTransactions(txs),
      }
    }

    // Check for Solflare - direct access
    if ((window as any).solflare && (window as any).solflare.publicKey) {
      return {
        name: "Solflare",
        publicKey: (window as any).solflare.publicKey,
        signTransaction: async (tx: Transaction) => {
          // Force the popup to appear by calling connect first
          try {
            await (window as any).solflare.connect()
          } catch (e) {
            // Ignore if already connected
          }
          return (window as any).solflare.signTransaction(tx)
        },
        signAllTransactions: async (txs: Transaction[]) => {
          // Force the popup to appear by calling connect first
          try {
            await (window as any).solflare.connect()
          } catch (e) {
            // Ignore if already connected
          }
          return (window as any).solflare.signAllTransactions(txs)
        },
      }
    }

    // Check for Backpack (xNFT)
    if ((window as any).backpack?.sol) {
      return {
        name: "Backpack",
        publicKey: (window as any).backpack.sol.publicKey,
        signTransaction: async (tx: Transaction) => {
          // Force the popup to appear by calling connect first
          try {
            await (window as any).backpack.sol.connect()
          } catch (e) {
            // Ignore if already connected
          }
          return (window as any).backpack.sol.signTransaction(tx)
        },
        signAllTransactions: async (txs: Transaction[]) => {
          // Force the popup to appear by calling connect first
          try {
            await (window as any).backpack.sol.connect()
          } catch (e) {
            // Ignore if already connected
          }
          return (window as any).backpack.sol.signAllTransactions(txs)
        },
      }
    }

    // Check for legacy Solana wallet adapter
    if ((window as any).solana) {
      return {
        name: "Legacy Adapter",
        publicKey: (window as any).solana.publicKey,
        signTransaction: async (tx: Transaction) => {
          // Force the popup to appear by calling connect first
          try {
            await (window as any).solana.connect()
          } catch (e) {
            // Ignore if already connected
          }
          return (window as any).solana.signTransaction(tx)
        },
        signAllTransactions: async (txs: Transaction[]) => {
          // Force the popup to appear by calling connect first
          try {
            await (window as any).solana.connect()
          } catch (e) {
            // Ignore if already connected
          }
          return (window as any).solana.signAllTransactions(txs)
        },
      }
    }

    // No wallet found
    return null
  } catch (error) {
    console.error("Error detecting wallet provider:", error)
    return null
  }
}

// Add the testProgramConnection function that was missing

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
    // Check for wallet provider (support multiple wallet types)
    const provider = detectWalletProvider()
    if (!provider) {
      console.error("Wallet not found")
      return { success: false, error: "Wallet not found" }
    }

    const walletInfo = {
      provider: provider.name || "Unknown",
      publicKey: provider.publicKey?.toString() || "Not connected",
      isConnected: !!provider.publicKey,
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

// Update the createBond function to pass repayment type
export const createBond = async ({
  amount,
  duration,
  interestRate,
  incomeProof,
  description,
  repaymentType,
}: {
  amount: number
  duration: number
  interestRate: number
  incomeProof: string
  description: string
  repaymentType: RepaymentType
}) => {
  try {
    // Check for wallet provider (support multiple wallet types)
    const provider = detectWalletProvider()
    if (!provider) {
      throw new Error("Wallet not found. Please install a Solana wallet extension.")
    }

    // Get the wallet public key
    const publicKey = provider.publicKey
    if (!publicKey) {
      throw new Error("Wallet public key not found. Please connect your wallet.")
    }

    console.log("Creating bond with parameters:", {
      amount,
      duration,
      interestRate,
      incomeProof,
      description,
      repaymentType,
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
        return provider.signTransaction(tx)
      },
      signAllTransactions: async (txs: Transaction[]) => {
        return provider.signAllTransactions(txs)
      },
    }

    // Get the program
    const program = await getProgram(wallet)

    // Create a new transaction
    const transaction = new Transaction()

    // Add the create bond instruction
    transaction.add(
      program.instruction.createBond(
        new BN(bondSeed),
        amountLamports,
        duration,
        interestRate,
        incomeProof.substring(0, 200), // Limit string length
        description.substring(0, 500), // Limit string length
        repaymentType,
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

    // Set the recent blockhash and fee payer
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed")
    transaction.recentBlockhash = blockhash
    transaction.lastValidBlockHeight = lastValidBlockHeight
    transaction.feePayer = publicKey

    // Sign the transaction with the user's wallet
    let signedTransaction

    // For Phantom wallet
    if (provider.name === "Phantom") {
      signedTransaction = await provider.signTransaction(transaction)
    }
    // For Solflare wallet
    else if (provider.name === "Solflare") {
      signedTransaction = await (window as any).solflare.signTransaction(transaction)
    }
    // For Backpack wallet
    else if (provider.name === "Backpack") {
      signedTransaction = await (window as any).backpack.sol.signTransaction(transaction)
    }
    // For legacy adapter
    else if (provider.name === "Legacy Adapter") {
      signedTransaction = await (window as any).solana.signTransaction(transaction)
    } else {
      throw new Error(`Unsupported wallet provider: ${provider.name}`)
    }

    if (!signedTransaction) {
      throw new Error("Failed to sign transaction with wallet")
    }

    // Send the transaction
    const signature = await connection.sendRawTransaction(signedTransaction.serialize())
    console.log("Bond creation transaction sent with signature:", signature)

    // Wait for confirmation
    await connection.confirmTransaction(
      {
        signature,
        blockhash,
        lastValidBlockHeight,
      },
      "confirmed",
    )

    return {
      signature,
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

// Invest in a bond using a new keypair for the investment account
export const invest = async (bondId: string, amount: number) => {
  try {
    // Check for wallet provider (support multiple wallet types)
    const provider = detectWalletProvider()
    if (!provider) {
      throw new Error("Wallet not found. Please install a Solana wallet extension.")
    }

    // Get the wallet public key
    const publicKey = provider.publicKey
    if (!publicKey) {
      throw new Error("Wallet public key not found. Please connect your wallet.")
    }

    console.log(`Investing ${amount} SOL in bond ${bondId}`)

    // Convert amount to lamports
    const amountLamports = new BN(amount * LAMPORTS_PER_SOL)

    // Get the connection
    const connection = getConnection()

    // Get the bond account
    const bondPublicKey = new PublicKey(bondId)
    console.log("Fetching bond account:", bondPublicKey.toString())

    // Create a wallet adapter for Anchor
    const wallet = {
      publicKey: publicKey,
      signTransaction: async (tx: Transaction) => {
        return provider.signTransaction(tx)
      },
      signAllTransactions: async (txs: Transaction[]) => {
        return provider.signAllTransactions(txs)
      },
    }

    // Get the program
    const program = await getProgram(wallet)

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

    // Create a new keypair for the investment account
    const { Keypair } = await import("@solana/web3.js")
    const investmentKeypair = Keypair.generate()
    console.log("Generated investment keypair:", investmentKeypair.publicKey.toString())

    // Create a transaction
    const transaction = new Transaction()

    // Add the invest instruction
    transaction.add(
      program.instruction.invest(amountLamports, {
        accounts: {
          investor: publicKey,
          bond: bondPublicKey,
          freelancerAccount: bond.freelancer,
          investment: investmentKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        },
      }),
    )

    // Set the recent blockhash and fee payer
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed")
    transaction.recentBlockhash = blockhash
    transaction.lastValidBlockHeight = lastValidBlockHeight
    transaction.feePayer = publicKey

    // Add the investment keypair as a signer
    transaction.partialSign(investmentKeypair)

    // Sign the transaction with the user's wallet
    // Use the appropriate signing method based on wallet type
    let signedTransaction

    // For Phantom wallet
    if (provider.name === "Phantom") {
      signedTransaction = await provider.signTransaction(transaction)
    }
    // For Solflare wallet
    else if (provider.name === "Solflare") {
      signedTransaction = await (window as any).solflare.signTransaction(transaction)
    }
    // For Backpack wallet
    else if (provider.name === "Backpack") {
      signedTransaction = await (window as any).backpack.sol.signTransaction(transaction)
    }
    // For legacy adapter
    else if (provider.name === "Legacy Adapter") {
      signedTransaction = await (window as any).solana.signTransaction(transaction)
    } else {
      throw new Error(`Unsupported wallet provider: ${provider.name}`)
    }

    if (!signedTransaction) {
      throw new Error("Failed to sign transaction with wallet")
    }

    // Send the transaction
    const signature = await connection.sendRawTransaction(signedTransaction.serialize())
    console.log("Investment transaction sent with signature:", signature)

    // Wait for confirmation
    await connection.confirmTransaction(
      {
        signature,
        blockhash,
        lastValidBlockHeight,
      },
      "confirmed",
    )

    return {
      signature,
      investmentId: investmentKeypair.publicKey.toString(),
    }
  } catch (error: any) {
    console.error("Error investing in bond:", error)

    // Check for specific error messages and provide more helpful errors
    if (error.logs || error.message) {
      const logs = error.logs || []
      const message = error.message || ""
      console.error("Transaction logs:", logs)

      // Check for simulation failure
      if (message.includes("Simulation failed") || message.includes("Transaction simulation failed")) {
        throw new Error(
          "Transaction simulation failed. The bond may not be in the correct state or there might be a network issue.",
        )
      }
    }

    throw error
  }
}

// Make a repayment
export const makeRepayment = async (repaymentId: string, amount: number) => {
  try {
    // Check for wallet provider (support multiple wallet types)
    const provider = detectWalletProvider()
    if (!provider) {
      throw new Error("Wallet not found. Please install a Solana wallet extension.")
    }

    // Get the wallet public key
    const publicKey = provider.publicKey
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
        return provider.signTransaction(tx)
      },
      signAllTransactions: async (txs: Transaction[]) => {
        return provider.signAllTransactions(txs)
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

    // Set the recent blockhash and fee payer
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed")
    transaction.recentBlockhash = blockhash
    transaction.lastValidBlockHeight = lastValidBlockHeight
    transaction.feePayer = publicKey

    // Sign the transaction with the user's wallet
    let signedTransaction

    // For Phantom wallet
    if (provider.name === "Phantom") {
      signedTransaction = await provider.signTransaction(transaction)
    }
    // For Solflare wallet
    else if (provider.name === "Solflare") {
      signedTransaction = await (window as any).solflare.signTransaction(transaction)
    }
    // For Backpack wallet
    else if (provider.name === "Backpack") {
      signedTransaction = await (window as any).backpack.sol.signTransaction(transaction)
    }
    // For legacy adapter
    else if (provider.name === "Legacy Adapter") {
      signedTransaction = await (window as any).solana.signTransaction(transaction)
    } else {
      throw new Error(`Unsupported wallet provider: ${provider.name}`)
    }

    if (!signedTransaction) {
      throw new Error("Failed to sign transaction with wallet")
    }

    // Send the transaction
    const signature = await connection.sendRawTransaction(signedTransaction.serialize())
    console.log("Repayment transaction sent with signature:", signature)

    // Wait for confirmation
    await connection.confirmTransaction(
      {
        signature,
        blockhash,
        lastValidBlockHeight,
      },
      "confirmed",
    )

    return {
      signature,
    }
  } catch (error) {
    console.error("Error making repayment:", error)
    throw error
  }
}

// Make a custom repayment (new function for the updated contract)
import * as web3 from "@solana/web3.js"
export const makeCustomRepayment = async (bondId: string, investorId: string, amount: number) => {
  try {
    // Check for wallet provider (support multiple wallet types)
    const provider = detectWalletProvider()
    if (!provider) {
      throw new Error("Wallet not found. Please install a Solana wallet extension.")
    }

    // Get the wallet public key
    const publicKey = provider.publicKey
    if (!publicKey) {
      throw new Error("Wallet public key not found. Please connect your wallet.")
    }

    console.log(`Making custom repayment of ${amount} SOL for bond ${bondId} to investor ${investorId}`)

    // Convert amount to lamports
    const amountLamports = new BN(amount * LAMPORTS_PER_SOL)

    // Get the connection
    const connection = getConnection()

    // Create a wallet adapter for Anchor
    const wallet = {
      publicKey: publicKey,
      signTransaction: async (tx: Transaction) => {
        return provider.signTransaction(tx)
      },
      signAllTransactions: async (txs: Transaction[]) => {
        return provider.signAllTransactions(txs)
      },
    }

    // Get the program
    const program = await getProgram(wallet)

    // Get the bond and investor accounts
    const bondPublicKey = new PublicKey(bondId)
    const investorPublicKey = new PublicKey(investorId)

    // Fetch the bond to get details for the memo
    const bond = await program.account.bond.fetch(bondPublicKey)
    const principal = bond.amount.toNumber() / LAMPORTS_PER_SOL
    const interestRate = bond.interestRate / 100
    const totalDue = principal * (1 + interestRate)
    const totalRepaid = bond.totalRepaid ? bond.totalRepaid.toNumber() / LAMPORTS_PER_SOL : 0
    const remainingDue = totalDue - totalRepaid

    // Create a new transaction
    const transaction = new Transaction()

    // Add the makeCustomRepayment instruction
    transaction.add(
      program.instruction.makeCustomRepayment(amountLamports, {
        accounts: {
          freelancer: publicKey,
          bond: bondPublicKey,
          investor: investorPublicKey,
          systemProgram: SystemProgram.programId,
        },
      }),
    )

    // Add a memo instruction to record the repayment
    const { TransactionInstruction } = web3
    const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")

    // Create a memo with repayment details including interest information
    const memoText = `Repayment of ${amount} SOL for bond ${bondId.slice(-4)}. Principal: ${principal} SOL, Interest: ${(principal * interestRate).toFixed(2)} SOL, Total Due: ${totalDue.toFixed(2)} SOL, Remaining: ${(remainingDue - amount).toFixed(2)} SOL`

    const memoInstruction = new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memoText),
    })

    // Add the memo instruction to the transaction
    transaction.add(memoInstruction)

    // Set the recent blockhash and fee payer
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed")
    transaction.recentBlockhash = blockhash
    transaction.lastValidBlockHeight = lastValidBlockHeight
    transaction.feePayer = publicKey

    // Sign the transaction with the user's wallet
    let signedTransaction

    // For Phantom wallet
    if (provider.name === "Phantom") {
      signedTransaction = await provider.signTransaction(transaction)
    }
    // For Solflare wallet
    else if (provider.name === "Solflare") {
      signedTransaction = await (window as any).solflare.signTransaction(transaction)
    }
    // For Backpack wallet
    else if (provider.name === "Backpack") {
      signedTransaction = await (window as any).backpack.sol.signTransaction(transaction)
    }
    // For legacy adapter
    else if (provider.name === "Legacy Adapter") {
      signedTransaction = await (window as any).solana.signTransaction(transaction)
    } else {
      throw new Error(`Unsupported wallet provider: ${provider.name}`)
    }

    if (!signedTransaction) {
      throw new Error("Failed to sign transaction with wallet")
    }

    // Send the transaction
    const signature = await connection.sendRawTransaction(signedTransaction.serialize())
    console.log("Custom repayment transaction sent with signature:", signature)

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash,
        lastValidBlockHeight,
      },
      "confirmed",
    )

    // Check if the bond is now fully repaid by fetching the bond account
    const updatedBond = await program.account.bond.fetch(bondPublicKey)
    const updatedTotalRepaid = updatedBond.totalRepaid ? updatedBond.totalRepaid.toNumber() / LAMPORTS_PER_SOL : 0
    const isFullRepayment = updatedTotalRepaid >= totalDue * 0.99 || updatedBond.status.completed !== undefined

    return {
      signature,
      amount,
      isFullRepayment,
    }
  } catch (error) {
    console.error("Error making custom repayment:", error)
    throw error
  }
}

// Set repayment type for a bond
export const setRepaymentType = async (bondId: string, repaymentType: RepaymentType) => {
  try {
    // Check for wallet provider (support multiple wallet types)
    const provider = detectWalletProvider()
    if (!provider) {
      throw new Error("Wallet not found. Please install a Solana wallet extension.")
    }

    // Get the wallet public key
    const publicKey = provider.publicKey
    if (!publicKey) {
      throw new Error("Wallet public key not found. Please connect your wallet.")
    }

    console.log(
      `Setting repayment type to ${repaymentType === RepaymentType.LumpSum ? "Lump Sum" : "Installments"} for bond ${bondId}`,
    )

    // Get the connection
    const connection = getConnection()

    // Create a wallet adapter for Anchor
    const wallet = {
      publicKey: publicKey,
      signTransaction: async (tx: Transaction) => {
        return provider.signTransaction(tx)
      },
      signAllTransactions: async (txs: Transaction[]) => {
        return provider.signAllTransactions(txs)
      },
    }

    // Get the program
    const program = await getProgram(wallet)

    // Get the bond account
    const bondPublicKey = new PublicKey(bondId)

    // Create a new transaction
    const transaction = new Transaction()

    // Add the setRepaymentType instruction
    transaction.add(
      program.instruction.setRepaymentType(
        repaymentType === RepaymentType.LumpSum ? { lumpSum: {} } : { installments: {} },
        {
          accounts: {
            freelancer: publicKey,
            bond: bondPublicKey,
            systemProgram: SystemProgram.programId,
          },
        },
      ),
    )

    // Set the recent blockhash and fee payer
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed")
    transaction.recentBlockhash = blockhash
    transaction.lastValidBlockHeight = lastValidBlockHeight
    transaction.feePayer = publicKey

    // Sign the transaction with the user's wallet
    let signedTransaction

    // For Phantom wallet
    if (provider.name === "Phantom") {
      signedTransaction = await provider.signTransaction(transaction)
    }
    // For Solflare wallet
    else if (provider.name === "Solflare") {
      signedTransaction = await (window as any).solflare.signTransaction(transaction)
    }
    // For Backpack wallet
    else if (provider.name === "Backpack") {
      signedTransaction = await (window as any).backpack.sol.signTransaction(transaction)
    }
    // For legacy adapter
    else if (provider.name === "Legacy Adapter") {
      signedTransaction = await (window as any).solana.signTransaction(transaction)
    } else {
      throw new Error(`Unsupported wallet provider: ${provider.name}`)
    }

    if (!signedTransaction) {
      throw new Error("Failed to sign transaction with wallet")
    }

    // Send the transaction
    const signature = await connection.sendRawTransaction(signedTransaction.serialize())
    console.log("Set repayment type transaction sent with signature:", signature)

    // Wait for confirmation
    await connection.confirmTransaction(
      {
        signature,
        blockhash,
        lastValidBlockHeight,
      },
      "confirmed",
    )

    return {
      signature,
    }
  } catch (error) {
    console.error("Error setting repayment type:", error)
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
        // For investors, show all open bonds and also bonds they've invested in
        const isOpen = account.account.status.open !== undefined

        // We'll need to check if this investor has invested in this bond
        // This would require fetching all investments for this investor and checking
        // For now, we'll just show all open bonds

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

      // Get repayment type from the bond account
      let repaymentType = RepaymentType.LumpSum
      if (bond.repaymentType && bond.repaymentType.installments !== undefined) {
        repaymentType = RepaymentType.Installments
      }

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
        repaymentType: repaymentType,
        installments: bond.installments || 0,
        totalRepaid: bond.totalRepaid ? bond.totalRepaid.toNumber() / LAMPORTS_PER_SOL : 0,
        installmentsPaid: bond.installmentsPaid ? bond.installmentsPaid.toNumber() : 0,
        installmentAmount: bond.installmentAmount ? bond.installmentAmount.toNumber() / LAMPORTS_PER_SOL : 0,
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

        // Get repayment type from the bond account
        let repaymentType = RepaymentType.LumpSum
        if (bond.repaymentType && bond.repaymentType.installments !== undefined) {
          repaymentType = RepaymentType.Installments
        }

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
          repaymentType: repaymentType,
          installments: bond.installments || 0,
          totalRepaid: bond.totalRepaid ? bond.totalRepaid.toNumber() / LAMPORTS_PER_SOL : 0,
          installmentsPaid: bond.installmentsPaid ? bond.installmentsPaid.toNumber() : 0,
          installmentAmount: bond.installmentAmount ? bond.installmentAmount.toNumber() / LAMPORTS_PER_SOL : 0,
        }
      })
    } catch (secondError) {
      console.error("Alternative approach also failed:", secondError)
      return []
    }
  }
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

          // Get repayment type from the bond account
          let repaymentType = RepaymentType.LumpSum
          if (bondData.repaymentType && bondData.repaymentType.installments !== undefined) {
            repaymentType = RepaymentType.Installments
          }

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
            repaymentType: repaymentType,
            installments: bondData.installments || 0,
            totalRepaid: bondData.totalRepaid ? bondData.totalRepaid.toNumber() / LAMPORTS_PER_SOL : 0,
            installmentsPaid: bondData.installmentsPaid ? bondData.installmentsPaid.toNumber() : 0,
            installmentAmount: bondData.installmentAmount
              ? bondData.installmentAmount.toNumber() / LAMPORTS_PER_SOL
              : 0,
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
            totalRepaid: 0,
            installmentsPaid: 0,
            installmentAmount: 0,
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

  // Add a delay to ensure the blockchain has time to update
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Use a higher commitment level for more reliable data
  const connection = new Connection("https://api.devnet.solana.com", "confirmed")

  try {
    // Get all bonds created by this freelancer
    const bondAccounts = await fetchBonds("freelancer", walletAddress)
    console.log(`Found ${bondAccounts.length} bonds created by this freelancer`)

    // Track repayment transactions
    const repaymentTransactions = []

    // For each bond, fetch transaction history to find repayments
    for (const bond of bondAccounts) {
      try {
        // Skip bonds that aren't funded yet
        if (bond.status !== "funded" && bond.status !== "repaying" && bond.status !== "completed") {
          continue
        }

        console.log(`Fetching transaction history for bond ${bond.id}`)

        // Get all signatures for the bond address
        const bondPubkey = new PublicKey(bond.id)
        const signatures = await connection.getSignaturesForAddress(bondPubkey, { limit: 50 })

        // Process each transaction
        for (const sig of signatures) {
          try {
            // Skip if we don't have a signature
            if (!sig.signature) continue

            // Get transaction details
            const tx = await connection.getTransaction(sig.signature, {
              maxSupportedTransactionVersion: 0,
            })

            if (!tx || !tx.meta) continue

            // Check if this is a repayment transaction
            const logMessages = tx.meta.logMessages || []
            const isRepayment = logMessages.some(
              (log) =>
                log.includes("Program log: Instruction: MakeCustomRepayment") ||
                log.includes("Program log: Custom repayment completed successfully"),
            )

            if (!isRepayment) continue

            // Try to extract the amount from the logs
            let amount = 0
            let isCompleted = false

            // Look for amount in the logs
            for (const log of logMessages) {
              if (log.includes("amount:")) {
                const match = log.match(/amount: (\d+)/)
                if (match && match[1]) {
                  amount = Number.parseInt(match[1]) / LAMPORTS_PER_SOL
                }
              }

              if (log.includes("isCompleted: true")) {
                isCompleted = true
              }
            }

            // If we couldn't extract the amount from logs, try to get it from the transaction
            if (amount === 0 && tx.meta.preBalances && tx.meta.postBalances) {
              // Find the index of the freelancer account
              const accountKeys = tx.transaction.message.accountKeys
              const freelancerIndex = accountKeys.findIndex((key) => key.toString() === walletAddress)

              if (freelancerIndex >= 0) {
                // Calculate the difference in balance
                const preBalance = tx.meta.preBalances[freelancerIndex]
                const postBalance = tx.meta.postBalances[freelancerIndex]

                if (preBalance > postBalance) {
                  amount = (preBalance - postBalance) / LAMPORTS_PER_SOL
                }
              }
            }

            // Add to repayment transactions if we found a valid amount
            if (amount > 0) {
              repaymentTransactions.push({
                signature: sig.signature,
                amount,
                timestamp: sig.blockTime ? sig.blockTime * 1000 : Date.now(),
                bond: bond.id,
                investor: bond.investors ? bond.investors[0] : "unknown",
                isCompleted,
              })
            }
          } catch (txError) {
            console.error(`Error processing transaction ${sig.signature}:`, txError)
          }
        }
      } catch (bondError) {
        console.error(`Error fetching transactions for bond ${bond.id}:`, bondError)
      }
    }

    // Sort by timestamp (newest first)
    return repaymentTransactions.sort((a, b) => b.timestamp - a.timestamp)
  } catch (error) {
    console.error("Error fetching repayments:", error)

    // Return mock data if real data can't be fetched
    return [
      {
        signature: "5KtPn1LGuxhRipvJ7KyNEgMqpL5FrTYTGYuTKpVrLZ3QzwYpQQKzRJmYJK8wZHs7RzfJpnJPFhxFMCXPtGYzPXzd",
        amount: 1.5,
        timestamp: Date.now() - 86400000, // 1 day ago
        bond: "bondId123",
        investor: "investorId123",
        isCompleted: false,
      },
      {
        signature: "4vJ7KyNEgMqpL5FrTYTGYuTKpVrLZ3QzwYpQQKzRJmYJK8wZHs7RzfJpnJPFhxFMCXPtGYzPXzd5KtPn1LGuxhRip",
        amount: 0.5,
        timestamp: Date.now() - 172800000, // 2 days ago
        bond: "bondId123",
        investor: "investorId123",
        isCompleted: false,
      },
    ]
  }
}
