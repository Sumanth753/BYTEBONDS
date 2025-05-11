import { PublicKey } from "@solana/web3.js"
import type { Program, BN } from "@project-serum/anchor"
import { PROGRAM_ID } from "./program"
import type {
  Bond,
  Investment,
  Repayment,
  SimplifiedBond,
  SimplifiedInvestment,
  SimplifiedRepayment,
} from "./simplified-program"
import type { Transaction } from "@solana/web3.js"

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

// Function to derive the bond PDA
export const deriveBondPDA = async (freelancer: PublicKey, bondSeed: BN): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [Buffer.from("bond"), freelancer.toBuffer(), bondSeed.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID,
  )
}

// Function to derive the repayment PDA
export const deriveRepaymentPDA = async (
  bond: PublicKey,
  investor: PublicKey,
  repaymentId: BN,
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [Buffer.from("repayment"), bond.toBuffer(), investor.toBuffer(), repaymentId.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID,
  )
}

// Function to fetch a bond by address
export const fetchBond = async (program: Program, bondAddress: string): Promise<SimplifiedBond | null> => {
  try {
    const bondPDA = new PublicKey(bondAddress)
    const bond = await program.account.bond.fetch(bondPDA)
    return simplifyBond(bondPDA, bond as unknown as Bond)
  } catch (error) {
    console.error("Error fetching bond:", error)
    return null
  }
}

// Function to fetch an investment by address
export const fetchInvestment = async (
  program: Program,
  investmentAddress: string,
): Promise<SimplifiedInvestment | null> => {
  try {
    const investmentPDA = new PublicKey(investmentAddress)
    const investment = await program.account.investment.fetch(investmentPDA)
    return simplifyInvestment(investmentPDA, investment as unknown as Investment)
  } catch (error) {
    console.error("Error fetching investment:", error)
    return null
  }
}

// Function to fetch a repayment by address
export const fetchRepayment = async (
  program: Program,
  repaymentAddress: string,
): Promise<SimplifiedRepayment | null> => {
  try {
    const repaymentPDA = new PublicKey(repaymentAddress)
    const repayment = await program.account.repayment.fetch(repaymentPDA)
    return simplifyRepayment(repaymentPDA, repayment as unknown as Repayment)
  } catch (error) {
    console.error("Error fetching repayment:", error)
    return null
  }
}

// Function to fetch all bonds for a freelancer
export const fetchFreelancerBonds = async (program: Program, freelancerAddress: string): Promise<SimplifiedBond[]> => {
  try {
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
  } catch (error) {
    console.error("Error fetching freelancer bonds:", error)
    return []
  }
}

// Function to fetch all investments for an investor
export const fetchInvestorInvestments = async (
  program: Program,
  investorAddress: string,
): Promise<SimplifiedInvestment[]> => {
  try {
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
  } catch (error) {
    console.error("Error fetching investor investments:", error)
    return []
  }
}

// Function to fetch all repayments for a bond
export const fetchBondRepayments = async (program: Program, bondAddress: string): Promise<SimplifiedRepayment[]> => {
  try {
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
  } catch (error) {
    console.error("Error fetching bond repayments:", error)
    return []
  }
}

// Function to simulate a transaction
export const simulateTransaction = async (
  connection: any,
  transaction: Transaction,
  signers: any[],
): Promise<boolean> => {
  try {
    // Clone the transaction before adding signers
    const simulationTransaction = Transaction.from(transaction.serialize())

    // Add any signers to the simulation transaction
    if (signers.length > 0) {
      simulationTransaction.partialSign(...signers)
    }

    // Simulate the transaction
    const result = await connection.simulateTransaction(simulationTransaction, {
      sigVerify: true,
    })

    // Check for errors
    if (result.value.err) {
      console.error("Transaction simulation failed:", result.value.err)
      return false
    }

    // Check for logs indicating success
    const logs = result.value.logs || []
    const success = logs.some((log) => log.includes("Program log: Instruction:"))

    if (!success) {
      console.warn("Transaction simulation did not indicate success, but no error was reported.")
    }

    return true
  } catch (error) {
    console.error("Error simulating transaction:", error)
    return false
  }
}
