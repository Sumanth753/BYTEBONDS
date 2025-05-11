import { type Connection, Transaction } from "@solana/web3.js"

/**
 * Verifies if a transaction will likely succeed by simulating it
 * Instead of cloning the transaction, we create a new one with the same instructions
 */
export async function simulateTransaction(
  connection: Connection,
  transaction: Transaction,
  signers: any[],
): Promise<boolean> {
  try {
    // Instead of cloning, we'll create a new transaction and copy over the instructions
    const simTransaction = new Transaction()

    // Copy over the instructions from the original transaction
    if (transaction.instructions) {
      transaction.instructions.forEach((instruction) => {
        simTransaction.add(instruction)
      })
    }

    // Get a recent blockhash for the simulation
    const { blockhash } = await connection.getLatestBlockhash("confirmed")
    simTransaction.recentBlockhash = blockhash

    // If there's a feePayer on the original transaction, use it
    if (transaction.feePayer) {
      simTransaction.feePayer = transaction.feePayer
    }

    // Sign with all signers
    if (signers.length > 0) {
      simTransaction.partialSign(...signers)
    }

    // Simulate the transaction
    console.log("Simulating transaction with instructions:", simTransaction.instructions.length)
    const simulation = await connection.simulateTransaction(simTransaction)

    if (simulation.value.err) {
      console.error("Transaction simulation failed:", simulation.value.err)
      if (simulation.value.logs) {
        console.error("Simulation logs:", simulation.value.logs.join("\n"))
      }
      return false
    }

    console.log("Transaction simulation successful")
    if (simulation.value.logs) {
      console.log("Simulation logs:", simulation.value.logs.join("\n"))
    }
    return true
  } catch (error) {
    console.error("Error simulating transaction:", error)
    return false
  }
}
