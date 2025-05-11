import { NextResponse } from "next/server"
import { fetchBonds } from "@/lib/program"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get("address")

    if (!address) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 })
    }

    const bonds = await fetchBonds("freelancer", address)
    return NextResponse.json(bonds)
  } catch (error) {
    console.error("Error fetching freelancer bonds:", error)
    return NextResponse.json({ error: "Failed to fetch bonds" }, { status: 500 })
  }
}
