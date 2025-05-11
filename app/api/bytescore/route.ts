import { NextResponse } from "next/server"
import { PublicKey } from "@solana/web3.js"
import { calculateByteScore } from "@/lib/bytescore"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get("address")

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 })
    }

    // Basic validation of wallet address format
    try {
      new PublicKey(walletAddress)
    } catch (error) {
      console.error("Invalid wallet address format:", error)
      return NextResponse.json({ error: "Invalid wallet address format" }, { status: 400 })
    }

    // Calculate ByteScore
    const byteScoreData = await calculateByteScore(walletAddress)

    return NextResponse.json(byteScoreData)
  } catch (error) {
    console.error("Error in ByteScore API:", error)
    return NextResponse.json({ error: "Failed to calculate ByteScore" }, { status: 500 })
  }
}
