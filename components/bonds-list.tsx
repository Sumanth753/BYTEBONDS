"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { fetchBonds, invest } from "@/lib/program"
import { Loader2, RefreshCw, Info } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface BondsListProps {
  userType: "freelancer" | "investor"
  onInvestSuccess?: () => void
}

export function BondsList({ userType, onInvestSuccess }: BondsListProps) {
  const { publicKey, connected } = useWallet()
  const [bonds, setBonds] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [investAmounts, setInvestAmounts] = useState<Record<string, string>>({})
  const [isInvesting, setIsInvesting] = useState<Record<string, boolean>>({})
  const { toast } = useToast()

  const fetchAvailableBonds = async () => {
    try {
      setIsRefreshing(true)
      const fetchedBonds = await fetchBonds(userType, publicKey?.toString())

      // Process bonds to add calculated fields
      const processedBonds = fetchedBonds.map((bond) => {
        const principal = bond.amount
        const interestRate = bond.interestRate / 100
        const interestAmount = principal * interestRate
        const totalReturn = principal + interestAmount
        const repaidAmount = bond.totalRepaid || 0
        const remainingAmount = totalReturn - repaidAmount
        const progressPercentage = Math.min(100, (repaidAmount / totalReturn) * 100)

        // If status is completed, ensure repaid amount shows full amount
        const isCompleted = bond.status === "completed"

        return {
          ...bond,
          principal,
          interestAmount,
          totalReturn,
          repaidAmount: isCompleted ? totalReturn : repaidAmount,
          remainingAmount: isCompleted ? 0 : remainingAmount,
          progressPercentage: isCompleted ? 100 : progressPercentage,
        }
      })

      setBonds(processedBonds)
    } catch (error) {
      console.error("Error fetching bonds:", error)
      toast({
        title: "Error",
        description: "Failed to fetch bonds. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (connected) {
      fetchAvailableBonds()
    }
  }, [connected, publicKey, userType])

  const handleRefresh = () => {
    fetchAvailableBonds()
  }

  const handleInvestAmountChange = (bondId: string, value: string) => {
    setInvestAmounts((prev) => ({
      ...prev,
      [bondId]: value,
    }))
  }

  const handleInvest = async (bondId: string) => {
    const amount = Number.parseFloat(investAmounts[bondId])
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid investment amount.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsInvesting((prev) => ({ ...prev, [bondId]: true }))

      await invest(bondId, amount)

      toast({
        title: "Investment successful",
        description: `Successfully invested ${amount.toFixed(2)} SOL in bond #${bondId.slice(-4)}.`,
      })

      // Clear the input
      setInvestAmounts((prev) => ({ ...prev, [bondId]: "" }))

      // Refresh bonds after a short delay
      setTimeout(() => {
        fetchAvailableBonds()
        if (onInvestSuccess) {
          onInvestSuccess()
        }
      }, 2000)
    } catch (error) {
      console.error("Error investing:", error)
      toast({
        title: "Investment failed",
        description: error.message || "Failed to invest. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsInvesting((prev) => ({ ...prev, [bondId]: false }))
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

  if (!connected) {
    return (
      <Card className="border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Available Bonds</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">Please connect your wallet to view available bonds.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">
          {userType === "freelancer" ? "Your Bonds" : "Available Bonds"}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
        >
          {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : bonds.length === 0 ? (
        <Card className="border-gray-800 bg-gray-900/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="text-center py-8 text-gray-400">
              <p>
                {userType === "freelancer"
                  ? "You haven't created any bonds yet."
                  : "There are no available bonds for investment."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <AnimatePresence>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bonds.map((bond) => (
              <motion.div
                key={bond.id}
                variants={itemVariants}
                className="group"
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="border-gray-800 bg-gray-900/50 backdrop-blur-sm overflow-hidden transition-all group-hover:border-purple-700/50 group-hover:shadow-lg group-hover:shadow-purple-900/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{bond.amount.toFixed(2)} SOL Bond</h3>
                        <p className="text-sm text-gray-400 truncate max-w-[200px]">
                          {bond.description || "No description"}
                        </p>
                      </div>
                      <Badge
                        className={
                          bond.status === "completed"
                            ? "bg-green-900/50 text-green-400 border-green-700"
                            : bond.status === "funded" || bond.status === "repaying"
                              ? "bg-blue-900/30 text-blue-400 border-blue-800"
                              : "bg-amber-900/30 text-amber-400 border-amber-800"
                        }
                      >
                        {bond.status.charAt(0).toUpperCase() + bond.status.slice(1)}
                      </Badge>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Amount</span>
                        <span className="text-white font-medium">{bond.amount.toFixed(2)} SOL</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 flex items-center">
                          Interest Rate
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 ml-1 text-gray-500" />
                              </TooltipTrigger>
                              <TooltipContent className="bg-gray-800 border-gray-700 text-white">
                                <p>Interest earned on investment</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </span>
                        <span className="text-white font-medium">{bond.interestRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Duration</span>
                        <span className="text-white font-medium">{bond.duration} months</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Created</span>
                        <span className="text-white font-medium">{new Date(bond.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {userType === "investor" && bond.status === "open" ? (
                      <div className="space-y-3">
                        <div>
                          <label htmlFor={`invest-${bond.id}`} className="block text-sm text-gray-400 mb-2">
                            Investment Amount (SOL)
                          </label>
                          <div className="flex space-x-2">
                            <Input
                              id={`invest-${bond.id}`}
                              type="number"
                              placeholder="Enter amount"
                              value={investAmounts[bond.id] || ""}
                              onChange={(e) => handleInvestAmountChange(bond.id, e.target.value)}
                              min={0.01}
                              step={0.01}
                              max={bond.amount}
                              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500"
                            />
                            <Button
                              onClick={() => handleInvest(bond.id)}
                              disabled={isInvesting[bond.id]}
                              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
                            >
                              {isInvesting[bond.id] ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Investing...
                                </>
                              ) : (
                                "Invest"
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant={bond.status === "completed" ? "outline" : "default"}
                        disabled={bond.status === "completed"}
                        className={
                          bond.status === "completed"
                            ? "w-full border-gray-700 bg-gray-800 text-gray-300"
                            : "w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
                        }
                      >
                        {userType === "freelancer"
                          ? bond.status === "completed"
                            ? "Completed"
                            : "Make Repayment"
                          : bond.status === "completed"
                            ? "Completed"
                            : "View Details"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </motion.div>
  )
}
