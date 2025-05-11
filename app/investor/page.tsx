"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WalletMultiButton } from "@/components/wallet-multi-button"
import { useWallet } from "@solana/wallet-adapter-react"
import { BondsList } from "@/components/bonds-list"
import { InvestmentsList } from "@/components/investments-list"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { fetchInvestments } from "@/lib/program"

export default function InvestorDashboard() {
  const { connected, publicKey } = useWallet()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [isLoading, setIsLoading] = useState(true)
  const [userInvestments, setUserInvestments] = useState([])

  useEffect(() => {
    if (connected && publicKey) {
      // Fetch user's investments when wallet is connected
      const fetchUserInvestments = async () => {
        try {
          setIsLoading(true)
          // Use direct function call instead of API if there are issues
          try {
            const investments = await fetch(`/api/investments?address=${publicKey.toString()}`).then((res) =>
              res.json(),
            )
            setUserInvestments(investments)
          } catch (apiError) {
            console.warn("API fetch failed, using direct function call:", apiError)
            const investments = await fetchInvestments(publicKey.toString())
            setUserInvestments(investments)
          }
        } catch (error) {
          console.error("Failed to fetch investments:", error)
          setUserInvestments([])
        } finally {
          setIsLoading(false)
        }
      }

      fetchUserInvestments()
    } else {
      setIsLoading(false)
      setUserInvestments([])
    }
  }, [connected, publicKey])

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
      <main className="flex-1 container py-6 md:py-12">
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="text-3xl font-bold">Investor Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400">Invest in freelancer bonds and track your returns</p>
          </div>

          <Alert variant="warning" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              You are connected to Solana Devnet. Make sure you have devnet SOL for testing.
            </AlertDescription>
          </Alert>

          {!connected ? (
            <Card>
              <CardHeader>
                <CardTitle>Connect Your Wallet</CardTitle>
                <CardDescription>Please connect your Phantom wallet to access the investor dashboard.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-6">
                <WalletMultiButton />
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="available-bonds">Available Bonds</TabsTrigger>
                <TabsTrigger value="my-investments">My Investments</TabsTrigger>
              </TabsList>
              <TabsContent value="dashboard" className="py-4">
                <div className="grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {isLoading
                            ? "..."
                            : `${userInvestments.reduce((total, inv) => total + (inv.investedAmount || 0), 0)} SOL`}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Across all bonds</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Active Investments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {isLoading ? "..." : userInvestments.filter((inv) => inv.status === "active").length}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Currently earning returns</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Expected Returns</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {isLoading
                            ? "..."
                            : `${userInvestments.reduce(
                                (total, inv) => total + (inv.investedAmount || 0) * (1 + (inv.interestRate || 0) / 100),
                                0,
                              )} SOL`}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Including interest</p>
                      </CardContent>
                    </Card>
                  </div>
                  <InvestmentsList />
                </div>
              </TabsContent>
              <TabsContent value="available-bonds" className="py-4">
                <BondsList userType="investor" onInvestSuccess={() => setActiveTab("my-investments")} />
              </TabsContent>
              <TabsContent value="my-investments" className="py-4">
                <InvestmentsList />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
      <footer className="border-t py-6">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 md:text-left">
            © {new Date().getFullYear()} ByteBonds. All rights reserved.
          </p>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 md:text-right">
            Program ID: 9Dv2v4Lhcndjv5Mtq3A3m5xZi5JwQkUg3qh9MKT5nqpP
          </p>
        </div>
      </footer>
    </div>
  )
}
