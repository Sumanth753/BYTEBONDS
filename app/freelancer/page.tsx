"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WalletMultiButton } from "@/components/wallet-multi-button"
import { useWallet } from "@solana/wallet-adapter-react"
import { CreateBondForm } from "@/components/create-bond-form"
import { BondsList } from "@/components/bonds-list"
import { RepaymentsList } from "@/components/repayments-list"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { fetchBonds, debugWalletConnection } from "@/lib/program"

export default function FreelancerDashboard() {
  const { connected, publicKey } = useWallet()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [isLoading, setIsLoading] = useState(true)
  const [userBonds, setUserBonds] = useState([])

  // Get tab from URL if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const tab = urlParams.get("tab")
      if (tab && ["dashboard", "create-bond", "repayments"].includes(tab)) {
        setActiveTab(tab)
      }
    }
  }, [])

  useEffect(() => {
    if (connected && publicKey) {
      // Debug wallet connection when wallet is connected
      debugWalletConnection().then((result) => {
        console.log("Wallet debug result:", result)
      })
    }
  }, [connected, publicKey])

  useEffect(() => {
    if (connected && publicKey) {
      // Fetch user's bonds when wallet is connected
      const fetchUserBonds = async () => {
        try {
          setIsLoading(true)
          console.log("Fetching bonds for freelancer:", publicKey.toString())
          // Use direct function call instead of API if there are issues
          try {
            const bonds = await fetch(`/api/bonds/freelancer?address=${publicKey.toString()}`).then((res) => res.json())
            console.log("Bonds fetched from API:", bonds)
            setUserBonds(bonds)
          } catch (apiError) {
            console.warn("API fetch failed, using direct function call:", apiError)
            const bonds = await fetchBonds("freelancer", publicKey.toString())
            console.log("Bonds fetched directly:", bonds)
            setUserBonds(bonds)
          }
        } catch (error) {
          console.error("Failed to fetch bonds:", error)
          setUserBonds([])
        } finally {
          setIsLoading(false)
        }
      }

      fetchUserBonds()
    } else {
      setIsLoading(false)
      setUserBonds([])
    }
  }, [connected, publicKey, activeTab])

  const handleBondCreated = () => {
    // Switch to dashboard tab and refresh bonds
    setActiveTab("dashboard")
    if (connected && publicKey) {
      fetchBonds("freelancer", publicKey.toString()).then((bonds) => {
        console.log("Bonds refreshed after creation:", bonds)
        setUserBonds(bonds)
      })
    }
  }

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
            <h1 className="text-3xl font-bold">Freelancer Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage your bonds and repayments</p>
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
                <CardDescription>
                  Please connect your Phantom wallet to access the freelancer dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-6">
                <WalletMultiButton />
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="create-bond">Create Bond</TabsTrigger>
                <TabsTrigger value="repayments">Repayments</TabsTrigger>
              </TabsList>
              <TabsContent value="dashboard" className="py-4">
                <div className="grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Bonds</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? "..." : userBonds.length}</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Across all time</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Active Bonds</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {isLoading
                            ? "..."
                            : userBonds.filter((bond) => bond.status === "open" || bond.status === "funded").length}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Currently being repaid</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Received</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {isLoading
                            ? "..."
                            : `${userBonds.reduce((total, bond) => total + (bond.funded || 0), 0)} SOL`}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">From all bonds</p>
                      </CardContent>
                    </Card>
                  </div>
                  <BondsList userType="freelancer" />
                </div>
              </TabsContent>
              <TabsContent value="create-bond" className="py-4">
                <CreateBondForm onSuccess={handleBondCreated} />
              </TabsContent>
              <TabsContent value="repayments" className="py-4">
                <RepaymentsList />
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
