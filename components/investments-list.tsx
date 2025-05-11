"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { fetchInvestments } from "@/lib/program"
import { Loader2, RefreshCw, ExternalLink, Info } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"

export function InvestmentsList() {
  const { publicKey, connected } = useWallet()
  const [investments, setInvestments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  const fetchUserInvestments = async () => {
    if (!publicKey) return

    try {
      setIsRefreshing(true)
      const userInvestments = await fetchInvestments(publicKey.toString())

      // Process investments to add calculated fields
      const processedInvestments = userInvestments.map((investment) => {
        const principal = investment.investedAmount || 0
        const interestRate = investment.interestRate / 100
        const interestAmount = principal * interestRate
        const totalReturn = principal + interestAmount
        const repaidAmount = investment.repaidAmount || 0
        const remainingAmount = totalReturn - repaidAmount
        const progressPercentage = Math.min(100, (repaidAmount / totalReturn) * 100)

        // If status is completed, ensure repaid amount shows full amount
        const isCompleted = investment.status === "completed"

        return {
          ...investment,
          principal,
          interestAmount,
          totalReturn,
          repaidAmount: isCompleted ? totalReturn : repaidAmount,
          remainingAmount: isCompleted ? 0 : remainingAmount,
          progressPercentage: isCompleted ? 100 : progressPercentage,
        }
      })

      setInvestments(processedInvestments)
    } catch (error) {
      console.error("Error fetching investments:", error)
      toast({
        title: "Error",
        description: "Failed to fetch your investments. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (connected && publicKey) {
      fetchUserInvestments()
    }
  }, [connected, publicKey])

  const handleRefresh = () => {
    fetchUserInvestments()
  }

  const getExplorerUrl = (address: string) => {
    return `https://explorer.solana.com/address/${address}?cluster=devnet`
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
          <CardTitle className="text-white">My Investments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">Please connect your wallet to view your investments.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">My Investments</h2>
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
      ) : investments.length === 0 ? (
        <Card className="border-gray-800 bg-gray-900/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="text-center py-8 text-gray-400">
              <p>You haven't made any investments yet.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <AnimatePresence>
          <div className="space-y-4">
            {investments.map((investment) => (
              <motion.div
                key={investment.id}
                variants={itemVariants}
                className="group"
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="border-gray-800 bg-gray-900/50 backdrop-blur-sm overflow-hidden transition-all group-hover:border-purple-700/50 group-hover:shadow-lg group-hover:shadow-purple-900/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          Bond #{investment.bondId?.slice(-4) || investment.id?.slice(-4)}
                        </h3>
                        <p className="text-sm text-gray-400">
                          Invested on {new Date(investment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        className={
                          investment.status === "completed"
                            ? "bg-green-900/50 text-green-400 border-green-700"
                            : "bg-blue-900/30 text-blue-400 border-blue-800"
                        }
                      >
                        {investment.status === "completed" ? "Completed" : "Active"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mb-6">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Invested Amount</p>
                        <p className="text-xl font-semibold text-white">{investment.principal.toFixed(2)} SOL</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-1 flex items-center">
                          Interest
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 ml-1 text-gray-500" />
                              </TooltipTrigger>
                              <TooltipContent className="bg-gray-800 border-gray-700 text-white">
                                <p>{investment.interestRate}% of invested amount</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </p>
                        <p className="text-xl font-semibold text-white">{investment.interestAmount.toFixed(2)} SOL</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Total Return</p>
                        <p className="text-xl font-semibold text-white">{investment.totalReturn.toFixed(2)} SOL</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mb-6">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Repaid So Far</p>
                        <p className="text-xl font-semibold text-white">{investment.repaidAmount.toFixed(2)} SOL</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Remaining</p>
                        <p className="text-xl font-semibold text-white">{investment.remainingAmount.toFixed(2)} SOL</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Freelancer</p>
                        <p className="text-xl font-semibold text-white truncate">
                          {investment.freelancer?.slice(0, 4)}...{investment.freelancer?.slice(-4)}
                        </p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="flex justify-between mb-2">
                        <p className="text-sm text-gray-400">Repayment Progress</p>
                        <p className="text-sm font-medium text-white">{investment.progressPercentage.toFixed(0)}%</p>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
                          style={{ width: `${investment.progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(getExplorerUrl(investment.id), "_blank")}
                        className="border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700 hover:text-white"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View on Explorer
                      </Button>
                    </div>
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
