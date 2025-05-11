import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const data = await request.json()

    // Log the wallet data for debugging
    console.log("Wallet debug data:", data)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in debug-wallet API:", error)
    return NextResponse.json({ error: "Failed to process debug data" }, { status: 500 })
  }
}
