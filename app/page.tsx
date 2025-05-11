"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { WalletMultiButton } from "@/components/wallet-multi-button"
import { useWallet } from "@solana/wallet-adapter-react"
import { FreelancerStats, InvestorStats } from "@/components/dashboard-stats"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { testProgramConnection } from "@/lib/program"

export default function Home() {
  const { connected } = useWallet()
  const [programConnected, setProgramConnected] = useState<boolean | null>(null)

  useEffect(() => {
    const checkConnection = async () => {
      const result = await testProgramConnection()
      setProgramConnected(result)
    }

    checkConnection()
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold">ByteBonds</span>
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link href="/" className="text-sm font-medium hover:underline underline-offset-4">
              Home
            </Link>
            <Link href="/freelancer" className="text-sm font-medium hover:underline underline-offset-4">
              For Freelancers
            </Link>
            <Link href="/investor" className="text-sm font-medium hover:underline underline-offset-4">
              For Investors
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <WalletMultiButton />
          </div>
        </div>
      </header>
      <main className="flex-1">
        {programConnected === false && (
          <Alert variant="destructive" className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>
              Could not connect to the ByteBonds program on Solana devnet. Please check the Program ID.
            </AlertDescription>
          </Alert>
        )}

        {programConnected === true && (
          <Alert className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connected to Devnet</AlertTitle>
            <AlertDescription>Successfully connected to the ByteBonds program on Solana devnet.</AlertDescription>
          </Alert>
        )}

        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                    Get Paid Upfront, Invest in Talent
                  </h1>
                  <p className="max-w-[600px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                    ByteBonds connects freelancers with inconsistent income to investors who provide upfront SOL in
                    exchange for future earnings.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href="/freelancer">
                    <Button className="px-8">I'm a Freelancer</Button>
                  </Link>
                  <Link href="/investor">
                    <Button variant="outline" className="px-8">
                      I'm an Investor
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="mx-auto lg:ml-auto flex flex-col space-y-4">
                <img
                  src="/blockchain-freelance-platform.png"
                  alt="ByteBonds Platform"
                  className="mx-auto aspect-video overflow-hidden rounded-xl object-cover"
                  width={500}
                  height={400}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
              <FreelancerStats />
              <InvestorStats />
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">How It Works</h2>
                <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  ByteBonds uses Solana blockchain to create a transparent, efficient marketplace for income-backed
                  bonds.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6 text-blue-600 dark:text-blue-400"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">For Freelancers</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Create a bond by providing proof of income and receive upfront SOL. Repay over time with a portion
                    of your earnings.
                  </p>
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6 text-blue-600 dark:text-blue-400"
                  >
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">For Investors</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Browse available bonds, invest in talented freelancers, and earn returns as they make repayments.
                  </p>
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6 text-blue-600 dark:text-blue-400"
                  >
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                  </svg>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Smart Contracts</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    All transactions are secured by Solana blockchain, ensuring transparency, low fees, and fast
                    settlement.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-50 dark:bg-gray-900">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Supported Wallets</h2>
                <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  ByteBonds supports multiple Solana wallets for your convenience and security.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col items-center justify-center space-y-2 rounded-lg border p-4 shadow-sm">
                <img src="/phantom-wallet-logo.png" alt="Phantom" className="h-16 w-16" />
                <h3 className="text-lg font-medium">Phantom</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Popular Solana wallet</p>
              </div>
              <div className="flex flex-col items-center justify-center space-y-2 rounded-lg border p-4 shadow-sm">
                <img src="/solflare-wallet-logo.png" alt="Solflare" className="h-16 w-16" />
                <h3 className="text-lg font-medium">Solflare</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Feature-rich wallet</p>
              </div>
              <div className="flex flex-col items-center justify-center space-y-2 rounded-lg border p-4 shadow-sm">
                <img src="/backpack-wallet-logo.png" alt="Backpack" className="h-16 w-16" />
                <h3 className="text-lg font-medium">Backpack</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Secure and simple</p>
              </div>
              <div className="flex flex-col items-center justify-center space-y-2 rounded-lg border p-4 shadow-sm">
                <img src="/coinbase-wallet-logo.png" alt="Coinbase" className="h-16 w-16" />
                <h3 className="text-lg font-medium">Coinbase</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Exchange integration</p>
              </div>
            </div>
            <div className="flex justify-center">
              <Button variant="outline" className="mt-4">
                <Link href="/freelancer">Connect Your Wallet</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t">
        <div className="container flex flex-col gap-4 py-10 md:flex-row md:gap-8 md:py-12">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-bold">ByteBonds</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Connecting freelancers with investors on the Solana blockchain.
            </p>
          </div>
          <div className="flex-1 space-y-4">
            <div className="text-sm font-medium">Links</div>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/" className="hover:underline">
                Home
              </Link>
              <Link href="/freelancer" className="hover:underline">
                For Freelancers
              </Link>
              <Link href="/investor" className="hover:underline">
                For Investors
              </Link>
            </nav>
          </div>
          <div className="flex-1 space-y-4">
            <div className="text-sm font-medium">Network</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Running on Solana Devnet</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Program ID: 9Dv2v4Lhcndjv5Mtq3A3m5xZi5JwQkUg3qh9MKT5nqpP
            </div>
          </div>
        </div>
        <div className="border-t py-6">
          <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 md:text-left">
              © {new Date().getFullYear()} ByteBonds. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
