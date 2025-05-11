"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WalletMultiButton } from "@/components/wallet-multi-button"
import { useWallet } from "@solana/wallet-adapter-react"
import { CreateBondForm } from "@/components/create-bond-form"
import { BondsList } from "@/components/bonds-list"
import { RepaymentsList } from "@/components/repayments-list"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react"
import { fetchBonds, debugWalletConnection } from "@/lib/program"
import { ByteScoreCard } from "@/components/byte-score-card"
import { Button } from "@/components/ui/button"
import { getUserRole, switchUserRole } from "@/lib/user-role"
import { useToast } from "@/components/ui/use-toast"

export default function FreelancerDashboard() {
  const { connected, publicKey } = useWallet()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [isLoading, setIsLoading] = useState(true)
  const [userBonds, setUserBonds] = useState([])
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [isSwitchingRole, setIsSwitchingRole] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Check if user has access to this dashboard
  useEffect(() => {
    if (!connected || !publicKey) {
      setHasAccess(null)
      return
    }

    const userRole = getUserRole(publicKey.toString())
    if (userRole === "freelancer") {
      setHasAccess(true)
    } else if (userRole === "investor") {
      setHasAccess(false)
    } else {
      // No role set, redirect to home for selection
      router.push("/")
    }
  }, [connected, publicKey, router])

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
    if (connected && publicKey && hasAccess) {
      // Debug wallet connection when wallet is connected
      debugWalletConnection().then((result) => {
        console.log("Wallet debug result:", result)
      })
    }
  }, [connected, publicKey, hasAccess])

  useEffect(() => {
    if (connected && publicKey && hasAccess) {
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
  }, [connected, publicKey, activeTab, hasAccess])

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

  const handleSwitchRole = async () => {
    if (!publicKey) return

    setIsSwitchingRole(true)
    try {
      await switchUserRole(publicKey.toString())
      toast({
        title: "Role switched",
        description: "You are now an investor.",
        duration: 3000,
      })
      router.push("/investor")
    } catch (error) {
      console.error("Failed to switch role:", error)
      toast({
        title: "Error",
        description: "Failed to switch your role. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSwitchingRole(false)
    }
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <header className="border-b border-gray-800">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <motion.span
              className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              ByteBonds
            </motion.span>
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link href="/" className="text-sm font-medium hover:text-purple-400 transition-colors">
              Home
            </Link>
            <Link href="/freelancer" className="text-sm font-medium text-purple-400 transition-colors">
              For Freelancers
            </Link>
            <button
              onClick={handleSwitchRole}
              disabled={isSwitchingRole}
              className="text-sm font-medium hover:text-purple-400 transition-colors bg-transparent border-0 cursor-pointer"
            >
              For Investors
            </button>
          </nav>
          <div className="flex items-center gap-4">
            <WalletMultiButton />
          </div>
        </div>
      </header>
      <main className="flex-1 container py-6 md:py-12">
        <AnimatePresence mode="wait">
          {hasAccess === false && (
            <motion.div
              key="no-access"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center h-[60vh] gap-6"
            >
              <div className="text-center space-y-4 max-w-md">
                <h2 className="text-2xl font-bold text-white">You're currently an investor</h2>
                <p className="text-gray-400">
                  You're currently using ByteBonds as an investor. Would you like to switch to freelancer mode?
                </p>
              </div>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="gap-2 border-gray-700 text-gray-300 hover:bg-gray-800"
                  onClick={() => router.push("/")}
                >
                  <ArrowLeft size={16} />
                  Return Home
                </Button>
                <Button
                  className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
                  onClick={handleSwitchRole}
                  disabled={isSwitchingRole}
                >
                  {isSwitchingRole ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  Switch to Freelancer
                </Button>
              </div>
            </motion.div>
          )}

          {hasAccess === true && (
            <motion.div
              key="dashboard"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col gap-8"
            >
              <motion.div variants={itemVariants}>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
                  Freelancer Dashboard
                </h1>
                <p className="text-gray-400">Manage your bonds and repayments</p>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Alert variant="warning" className="mb-4 border-amber-900 bg-amber-950/50 text-amber-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    You are connected to Solana Devnet. Make sure you have devnet SOL for testing.
                  </AlertDescription>
                </Alert>
              </motion.div>

              {!connected ? (
                <motion.div variants={itemVariants}>
                  <Card className="border-gray-800 bg-gray-900/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Connect Your Wallet</CardTitle>
                      <CardDescription className="text-gray-400">
                        Please connect your Phantom wallet to access the freelancer dashboard.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center py-6">
                      <WalletMultiButton />
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div variants={itemVariants}>
                  <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-gray-800/50 p-1">
                      <TabsTrigger
                        value="dashboard"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
                      >
                        Dashboard
                      </TabsTrigger>
                      <TabsTrigger
                        value="create-bond"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
                      >
                        Create Bond
                      </TabsTrigger>
                      <TabsTrigger
                        value="repayments"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
                      >
                        Repayments
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="dashboard" className="py-4">
                      <div className="grid gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <motion.div
                            className="group"
                            whileHover={{ y: -5 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <Card className="border-gray-800 bg-gray-900/50 backdrop-blur-sm transition-all group-hover:border-purple-700/50 group-hover:shadow-lg group-hover:shadow-purple-900/20">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-300">Total Bonds</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-2xl font-bold text-white">
                                  {isLoading ? "..." : userBonds.length}
                                </div>
                                <p className="text-xs text-gray-500">Across all time</p>
                              </CardContent>
                            </Card>
                          </motion.div>
                          <motion.div
                            className="group"
                            whileHover={{ y: -5 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <Card className="border-gray-800 bg-gray-900/50 backdrop-blur-sm transition-all group-hover:border-blue-700/50 group-hover:shadow-lg group-hover:shadow-blue-900/20">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-300">Active Bonds</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-2xl font-bold text-white">
                                  {isLoading
                                    ? "..."
                                    : userBonds.filter((bond) => bond.status === "open" || bond.status === "funded")
                                        .length}
                                </div>
                                <p className="text-xs text-gray-500">Currently being repaid</p>
                              </CardContent>
                            </Card>
                          </motion.div>
                          <motion.div
                            className="group"
                            whileHover={{ y: -5 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <Card className="border-gray-800 bg-gray-900/50 backdrop-blur-sm transition-all group-hover:border-green-700/50 group-hover:shadow-lg group-hover:shadow-green-900/20">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-300">Total Received</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-2xl font-bold text-white">
                                  {isLoading
                                    ? "..."
                                    : `${userBonds.reduce((total, bond) => total + (bond.funded || 0), 0).toFixed(2)} SOL`}
                                </div>
                                <p className="text-xs text-gray-500">From all bonds</p>
                              </CardContent>
                            </Card>
                          </motion.div>
                          <ByteScoreCard />
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
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <footer className="border-t border-gray-800 py-6">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-center text-sm text-gray-500 md:text-left">
            © {new Date().getFullYear()} ByteBonds. All rights reserved.
          </p>
          <p className="text-center text-sm text-gray-500 md:text-right">
            Program ID: 9Dv2v4Lhcndjv5Mtq3A3m5xZi5JwQkUg3qh9MKT5nqpP
          </p>
        </div>
      </footer>
    </div>
  )
}
