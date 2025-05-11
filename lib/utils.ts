import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Program, AnchorProvider, type Idl } from "@project-serum/anchor"
import { Connection, PublicKey } from "@solana/web3.js"
import idl from "../idl/bytebonds.json"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getProgram = async (wallet: any) => {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed")
  const PROGRAM_ID = new PublicKey("9Dv2v4Lhcndjv5Mtq3A3m5xZi5JwQkUg3qh9MKT5nqpP")

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

export const connectToPhantom = async () => {
  try {
    // Check if Phantom is installed
    const provider = (window as any).phantom?.solana
    if (!provider) {
      throw new Error("Phantom wallet not found. Please install the Phantom wallet extension.")
    }

    // Connect to Phantom
    const response = await provider.connect()
    return {
      publicKey: response.publicKey,
      provider,
    }
  } catch (error) {
    console.error("Error connecting to Phantom wallet:", error)
    throw error
  }
}

export const getExplorerUrl = (signature: string, network: "mainnet" | "devnet" | "testnet" = "devnet") => {
  return `https://explorer.solana.com/tx/${signature}?cluster=${network}`
}
