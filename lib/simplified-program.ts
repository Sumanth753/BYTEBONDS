import { type Connection, PublicKey, SystemProgram, type Transaction } from "@solana/web3.js"
import { type Program, BN, web3 } from "@project-serum/anchor"

// Define types based on the IDL
export type BondStatus = "Open" | "Funded" | "Repaying" | "Completed"
export type RepaymentStatus = "Pending" | "Paid" | "Overdue"
export type RepaymentType = "LumpSum" | "Installments"

export interface Bond {
  freelancer: PublicKey
  amount: BN
  duration: number
  interestRate: number
  funded: BN
  status: BondStatus
  incomeProof: string
  description: string
  createdAt: BN
  bondSeed: BN
  bump: number
  repaymentType: RepaymentType
  totalRepaid: BN
  installmentsPaid: number
  installmentAmount: BN
}

export interface Investment {
  investor: PublicKey
  bond: PublicKey
  amount: BN
  createdAt: BN
}

export interface Repayment {
  bond: PublicKey
  investor: PublicKey
  amount: BN
  dueDate: BN
  status: RepaymentStatus
  createdAt: BN
  paidAt: BN | null
  installmentNumber: number
}

export interface SimplifiedBond {
  address: string
  freelancer: string
  amount: number
  duration: number
  interestRate: number
  funded: number
  status: BondStatus
  incomeProof: string
  description: string
  createdAt: number
  repaymentType: RepaymentType
  totalRepaid: number
  installmentsPaid: number
  installmentAmount: number
  remainingAmount: number
}

export interface SimplifiedInvestment {
  address: string
  investor: string
  bond: string
  amount: number
  createdAt: number
}

export interface SimplifiedRepayment {
  address: string
  bond: string
  investor: string
  amount: number
  dueDate: number
  status: RepaymentStatus
  createdAt: number
  paidAt: number | null
  installmentNumber: number
}

export interface RepaymentTransaction {
  signature: string
  amount: number
  timestamp: number
  investor: string
  bond: string
  isCompleted: boolean
}

// Helper function to convert BN to number
const bnToNumber = (bn: BN): number => {
  return bn.toNumber()
}

// Helper function to convert PublicKey to string
const pkToString = (pk: PublicKey): string => {
  return pk.toString()
}

// Helper function to simplify a Bond
export const simplifyBond = (address: PublicKey, bond: Bond): SimplifiedBond => {
  const amount = bnToNumber(bond.amount)
  const funded = bnToNumber(bond.funded)
  const totalRepaid = bnToNumber(bond.totalRepaid)

  return {
    address: pkToString(address),
    freelancer: pkToString(bond.freelancer),
    amount,
    duration: bond.duration,
    interestRate: bond.interestRate,
    funded,
    status: bond.status,
    incomeProof: bond.incomeProof,
    description: bond.description,
    createdAt: bnToNumber(bond.createdAt),
    repaymentType: bond.repaymentType,
    totalRepaid,
    installmentsPaid: bond.installmentsPaid,
    installmentAmount: bnToNumber(bond.installmentAmount),
    remainingAmount: amount - totalRepaid,
  }
}

// Helper function to simplify an Investment
export const simplifyInvestment = (address: PublicKey, investment: Investment): SimplifiedInvestment => {
  return {
    address: pkToString(address),
    investor: pkToString(investment.investor),
    bond: pkToString(investment.bond),
    amount: bnToNumber(investment.amount),
    createdAt: bnToNumber(investment.createdAt),
  }
}

// Helper function to simplify a Repayment
export const simplifyRepayment = (address: PublicKey, repayment: Repayment): SimplifiedRepayment => {
  return {
    address: pkToString(address),
    bond: pkToString(repayment.bond),
    investor: pkToString(repayment.investor),
    amount: bnToNumber(repayment.amount),
    dueDate: bnToNumber(repayment.dueDate),
    status: repayment.status,
    createdAt: bnToNumber(repayment.createdAt),
    paidAt: repayment.paidAt ? bnToNumber(repayment.paidAt) : null,
    installmentNumber: repayment.installmentNumber,
  }
}

// Function to create a bond
export const createBond = async (
  program: Program,
  freelancer: web3.Keypair,
  amount: number,
  duration: number,
  interestRate: number,
  incomeProof: string,
  description: string,
): Promise<string> => {
  const bondSeed = new BN(Date.now())

  // Derive the bond PDA
  const [bondPDA] = await PublicKey.findProgramAddress(
    [Buffer.from("bond"), freelancer.publicKey.toBuffer(), bondSeed.toArrayLike(Buffer, "le", 8)],
    program.programId,
  )

  // Create the bond
  const tx = await program.methods
    .createBond(bondSeed, new BN(amount), duration, interestRate, incomeProof, description)
    .accounts({
      freelancer: freelancer.publicKey,
      bond: bondPDA,
      systemProgram: SystemProgram.programId,
    })
    .signers([freelancer])
    .rpc()

  return tx
}

// Function to invest in a bond
export const invest = async (
  program: Program,
  investor: web3.Keypair,
  bondAddress: string,
  amount: number,
): Promise<string> => {
  const bondPDA = new PublicKey(bondAddress)

  // Fetch the bond to get the freelancer
  const bond = await program.account.bond.fetch(bondPDA)
  const freelancer = bond.freelancer

  // Create a new investment account
  const investment = web3.Keypair.generate()

  // Invest in the bond
  const tx = await program.methods
    .invest(new BN(amount))
    .accounts({
      investor: investor.publicKey,
      bond: bondPDA,
      freelancerAccount: freelancer,
      investment: investment.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([investor, investment])
    .rpc()

  return tx
}

// Function to make a repayment
export const makeRepayment = async (
  program: Program,
  freelancer: web3.Keypair,
  bondAddress: string,
  repaymentId: number,
  amount: number,
  investorAddress: string,
): Promise<string> => {
  const bondPDA = new PublicKey(bondAddress)
  const investor = new PublicKey(investorAddress)

  // Derive the repayment PDA
  const [repaymentPDA] = await PublicKey.findProgramAddress(
    [
      Buffer.from("repayment"),
      bondPDA.toBuffer(),
      investor.toBuffer(),
      new BN(repaymentId).toArrayLike(Buffer, "le", 8),
    ],
    program.programId,
  )

  // Make the repayment
  const tx = await program.methods
    .makeRepayment(new BN(repaymentId), new BN(amount))
    .accounts({
      freelancer: freelancer.publicKey,
      bond: bondPDA,
      repayment: repaymentPDA,
      investorAccount: investor,
      systemProgram: SystemProgram.programId,
    })
    .signers([freelancer])
    .rpc()

  return tx
}

// Function to make a custom repayment (direct payment)
export const makeCustomRepayment = async (
  program: Program,
  freelancer: web3.Keypair,
  bondAddress: string,
  investorAddress: string,
  amount: number,
): Promise<string> => {
  const bondPDA = new PublicKey(bondAddress)
  const investor = new PublicKey(investorAddress)

  // Make the custom repayment
  const tx = await program.methods
    .makeCustomRepayment(new BN(amount))
    .accounts({
      freelancer: freelancer.publicKey,
      bond: bondPDA,
      investor: investor,
      systemProgram: SystemProgram.programId,
    })
    .signers([freelancer])
    .rpc()

  return tx
}

// Function to set repayment type
export const setRepaymentType = async (
  program: Program,
  freelancer: web3.Keypair,
  bondAddress: string,
  repaymentType: RepaymentType,
): Promise<string> => {
  const bondPDA = new PublicKey(bondAddress)

  // Set the repayment type
  const tx = await program.methods
    .setRepaymentType({ [repaymentType]: {} })
    .accounts({
      freelancer: freelancer.publicKey,
      bond: bondPDA,
      systemProgram: SystemProgram.programId,
    })
    .signers([freelancer])
    .rpc()

  return tx
}

// Function to fetch all bonds
export const fetchBonds = async (program: Program): Promise<SimplifiedBond[]> => {
  const bonds = await program.account.bond.all()
  return bonds.map((bond) => simplifyBond(bond.publicKey, bond.account as unknown as Bond))
}

// Function to fetch bonds for a specific freelancer
export const fetchFreelancerBonds = async (program: Program, freelancerAddress: string): Promise<SimplifiedBond[]> => {
  const freelancer = new PublicKey(freelancerAddress)
  const bonds = await program.account.bond.all([
    {
      memcmp: {
        offset: 8, // After the discriminator
        bytes: freelancer.toBase58(),
      },
    },
  ])
  return bonds.map((bond) => simplifyBond(bond.publicKey, bond.account as unknown as Bond))
}

// Function to fetch investments for a specific investor
export const fetchInvestorInvestments = async (
  program: Program,
  investorAddress: string,
): Promise<SimplifiedInvestment[]> => {
  const investor = new PublicKey(investorAddress)
  const investments = await program.account.investment.all([
    {
      memcmp: {
        offset: 8, // After the discriminator
        bytes: investor.toBase58(),
      },
    },
  ])
  return investments.map((investment) =>
    simplifyInvestment(investment.publicKey, investment.account as unknown as Investment),
  )
}

// Function to fetch repayments for a specific bond
export const fetchBondRepayments = async (program: Program, bondAddress: string): Promise<SimplifiedRepayment[]> => {
  const bond = new PublicKey(bondAddress)
  const repayments = await program.account.repayment.all([
    {
      memcmp: {
        offset: 8, // After the discriminator
        bytes: bond.toBase58(),
      },
    },
  ])
  return repayments.map((repayment) =>
    simplifyRepayment(repayment.publicKey, repayment.account as unknown as Repayment),
  )
}

// Function to fetch repayment transactions from the blockchain
export const fetchRepayments = async (
  connection: Connection,
  bondAddress: string,
  freelancerAddress: string,
  investorAddress: string,
): Promise<RepaymentTransaction[]> => {
  // Fetch all signatures for the bond address
  const bondPubkey = new PublicKey(bondAddress)
  const signatures = await connection.getSignaturesForAddress(bondPubkey)

  // Fetch transaction details for each signature
  const transactions = await Promise.all(
    signatures.map(async (sig) => {
      try {
        const tx = await connection.getTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        })

        if (!tx || !tx.meta) return null

        // Check if this is a CustomRepaymentEvent
        const logMessages = tx.meta.logMessages || []
        const eventLog = logMessages.find(
          (log) =>
            log.includes("CustomRepaymentEvent") &&
            log.includes(bondAddress) &&
            log.includes(freelancerAddress) &&
            log.includes(investorAddress),
        )

        if (!eventLog) return null

        // Parse the amount and isCompleted from the log
        const amountMatch = eventLog.match(/amount: (\d+)/)
        const isCompletedMatch = eventLog.match(/isCompleted: (true|false)/)
        const totalRepaidMatch = eventLog.match(/totalRepaid: (\d+)/)

        if (!amountMatch || !isCompletedMatch) return null

        const amount = Number.parseInt(amountMatch[1]) / 1_000_000_000 // Convert lamports to SOL
        const isCompleted = isCompletedMatch[1] === "true"

        return {
          signature: sig.signature,
          amount,
          timestamp: sig.blockTime ? sig.blockTime * 1000 : Date.now(),
          investor: investorAddress,
          bond: bondAddress,
          isCompleted,
        }
      } catch (error) {
        console.error("Error fetching transaction:", error)
        return null
      }
    }),
  )

  // Filter out null transactions and sort by timestamp (newest first)
  return transactions.filter((tx): tx is RepaymentTransaction => tx !== null).sort((a, b) => b.timestamp - a.timestamp)
}

// Function to add a memo to a transaction
export const addMemoToTransaction = (transaction: Transaction, memo: string): Transaction => {
  // Import the TransactionInstruction and Memo Program ID
  const { TransactionInstruction } = web3
  const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")

  // Create a memo instruction
  const instruction = new TransactionInstruction({
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memo),
  })

  // Add the instruction to the transaction
  transaction.add(instruction)

  return transaction
}
