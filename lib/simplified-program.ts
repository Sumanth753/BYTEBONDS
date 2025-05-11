import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Keypair } from "@solana/web3.js"

// Production Program ID
export const PROGRAM_ID = new PublicKey("9Dv2v4Lhcndjv5Mtq3A3m5xZi5JwQkUg3qh9MKT5nqpP")

// Get connection to Solana devnet
export const getConnection = () => {
  return new Connection("https://api.devnet.solana.com", "confirmed")
}

// Simplified function to create a mock bond transaction
// This is a fallback in case the full implementation has issues
export const createSimplifiedBond = async (
  publicKey: PublicKey,
  amount: number,
  duration: number,
  interestRate: number,
  description: string,
) => {
  try {
    // Generate a new keypair for the bond account
    const bondKeypair = Keypair.generate()

    // Get the connection
    const connection = getConnection()

    // Calculate rent exemption for a small account
    const rentExemption = await connection.getMinimumBalanceForRentExemption(100)

    // Create a simple transaction that just creates an account
    // This is a simplified version that should work with most wallets
    const transaction = new Transaction()

    // Add create account instruction
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: publicKey,
        newAccountPubkey: bondKeypair.publicKey,
        lamports: rentExemption,
        space: 100, // Small space for testing
        programId: PROGRAM_ID,
      }),
    )

    // Add a memo to simulate bond creation
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: publicKey, // Send to self
        lamports: 100, // Minimal amount
      }),
    )

    return {
      transaction,
      signers: [bondKeypair],
      bondId: bondKeypair.publicKey.toString(),
    }
  } catch (error) {
    console.error("Error creating simplified bond:", error)
    throw error
  }
}

// Simplified function to invest in a bond
export const investSimplified = async (publicKey: PublicKey, bondId: string, amount: number) => {
  try {
    // Generate a new keypair for the investment account
    const investmentKeypair = Keypair.generate()

    // Create a simple transaction that just transfers SOL
    const transaction = new Transaction()

    // Add a transfer instruction to simulate investment
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: new PublicKey(bondId),
        lamports: amount * LAMPORTS_PER_SOL,
      }),
    )

    return {
      transaction,
      signers: [],
      investmentId: investmentKeypair.publicKey.toString(),
    }
  } catch (error) {
    console.error("Error creating simplified investment:", error)
    throw error
  }
}

// Simplified function to make a repayment
export const makeSimplifiedRepayment = async (publicKey: PublicKey, repaymentId: string, amount: number) => {
  try {
    // Create a simple transaction that just transfers SOL
    const transaction = new Transaction()

    // Add a transfer instruction to simulate repayment
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: publicKey, // Send to self as a placeholder
        lamports: amount * LAMPORTS_PER_SOL,
      }),
    )

    return {
      transaction,
      signers: [],
    }
  } catch (error) {
    console.error("Error creating simplified repayment:", error)
    throw error
  }
}
