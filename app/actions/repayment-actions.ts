"use server"

import { Program, AnchorProvider, web3 } from "@project-serum/anchor"
import { Connection } from "@solana/web3.js"
import { IDL } from "../../idl/bytebonds"
import { PROGRAM_ID } from "../../lib/constants"
import { makeCustomRepayment, setRepaymentType } from "../../lib/simplified-program"
import type { RepaymentType } from "../../lib/program"

// Server-side function to make a repayment
export async function serverMakeRepayment(bondAddress: string, investorAddress: string, amountInLamports: number) {
  try {
    // Create a connection to the Solana network
    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com")

    // Create a keypair from the private key (stored securely as a server-side env variable)
    const keypair = web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(process.env.FREELANCER_PRIVATE_KEY || "[]")))

    // Create a provider with the keypair
    const provider = new AnchorProvider(
      connection,
      {
        publicKey: keypair.publicKey,
        signTransaction: async (tx) => {
          tx.partialSign(keypair)
          return tx
        },
        signAllTransactions: async (txs) => {
          return txs.map((tx) => {
            tx.partialSign(keypair)
            return tx
          })
        },
      },
      { commitment: "confirmed" },
    )

    // Initialize the program
    const program = new Program(IDL, PROGRAM_ID, provider)

    // Make the repayment
    const tx = await makeCustomRepayment(program, keypair, bondAddress, investorAddress, amountInLamports)

    return { success: true, signature: tx }
  } catch (error) {
    console.error("Error making repayment:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// Server-side function to set repayment type
export async function serverSetRepaymentType(bondAddress: string, repaymentType: RepaymentType) {
  try {
    // Create a connection to the Solana network
    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com")

    // Create a keypair from the private key (stored securely as a server-side env variable)
    const keypair = web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(process.env.FREELANCER_PRIVATE_KEY || "[]")))

    // Create a provider with the keypair
    const provider = new AnchorProvider(
      connection,
      {
        publicKey: keypair.publicKey,
        signTransaction: async (tx) => {
          tx.partialSign(keypair)
          return tx
        },
        signAllTransactions: async (txs) => {
          return txs.map((tx) => {
            tx.partialSign(keypair)
            return tx
          })
        },
      },
      { commitment: "confirmed" },
    )

    // Initialize the program
    const program = new Program(IDL, PROGRAM_ID, provider)

    // Set the repayment type
    const tx = await setRepaymentType(program, keypair, bondAddress, repaymentType)

    return { success: true, signature: tx }
  } catch (error) {
    console.error("Error setting repayment type:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
