"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchBonds, fetchRepayments, makeCustomRepayment } from "@/lib/program"
import { Loader2, RefreshCw, Info, ExternalLink } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export function RepaymentsList() {
  const { publicKey, connected } = useWallet()
  const [bonds, setBonds] = useState<any[]>([])
  const [repayments, setRepayments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [repaymentAmounts, setRepaymentAmounts] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({})
  const { toast } = useToast()

  const fetchUserData = async () => {
    if (!publicKey) return

    try {
      setIsRefreshing(true)

      // Fetch bonds
      const userBonds = await fetchBonds("freelancer", publicKey.toString())
      const activeBonds = userBonds.filter((bond) => bond.status === "funded" || bond.status === "repaying")
      setBonds(activeBonds)

      // Fetch repayment history
      const repaymentHistory = await fetchRepayments(publicKey.toString())
      setRepayments(repaymentHistory)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch your data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (connected && publicKey) {
      fetchUserData()
    }
  }, [connected, publicKey])

  const handleRefresh = () => {
    fetchUserData()
  }

  const handleRepaymentAmountChange = (bondId: string, value: string) => {
    setRepaymentAmounts((prev) => ({
      ...prev,
      [bondId]: value,
    }))
  }

  const handlePayFullAmount = (bondId: string, remainingAmount: number) => {
    setRepaymentAmounts((prev) => ({
      ...prev,
      [bondId]: remainingAmount.toFixed(2),
    }))
  }

  const handleMakeRepayment = async (bondId: string, investorId: string) => {
    const amount = Number.parseFloat(repaymentAmounts[bondId])
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid repayment amount.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting((prev) => ({ ...prev, [bondId]: true }))

      const result = await makeCustomRepayment(bondId, investorId, amount)

      toast({
        title: "Repayment successful",
        description: result.isFullRepayment
          ? "Your bond has been fully repaid!"
          : `Successfully repaid ${amount.toFixed(2)} SOL.`,
      })

      // Clear the input
      setRepaymentAmounts((prev) => ({ ...prev, [bondId]: "" }))

      // Refresh data after a short delay
      setTimeout(() => {
        fetchUserData()
      }, 2000)
    } catch (error) {
      console.error("Error making repayment:", error)
      toast({
        title: "Repayment failed",
        description: error.message || "Failed to make repayment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting((prev) => ({ ...prev, [bondId]: false }))
    }
  }

  const getExplorerUrl = (signature: string) => {
    return `https://explorer.solana.com/tx/${signature}?cluster=devnet`
  }

  if (!connected) {
    return (
      <Card className="border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Repayments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">Please connect your wallet to view your repayments.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Repayments</h2>
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

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="bg-gray-800 border-b border-gray-700 w-full justify-start rounded-none p-0">
          <TabsTrigger
            value="pending"
            className="data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-4 py-2 text-gray-400 data-[state=active]:text-white"
          >
            Pending Repayments
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-4 py-2 text-gray-400 data-[state=active]:text-white"
          >
            Repayment History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : bonds.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>You don't have any active bonds that require repayment.</p>
            </div>
          ) : (
            <AnimatePresence>
              <div className="space-y-4">
                {bonds.map((bond) => {
                  // Calculate interest amount
                  const principal = bond.amount
                  const interestRate = bond.interestRate / 100
                  const interestAmount = principal * interestRate
                  const totalDue = principal + interestAmount
                  const totalRepaid = bond.totalRepaid || 0
                  const remaining = totalDue - totalRepaid
                  const progressPercentage = Math.min(100, (totalRepaid / totalDue) * 100)

                  return (
                    <motion.div
                      key={bond.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="border-gray-800 bg-gray-900/50 backdrop-blur-sm overflow-hidden">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-white">Bond #{bond.id.slice(-4)}</h3>
                              <p className="text-sm text-gray-400">
                                Created on {new Date(bond.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="px-3 py-1 rounded-full bg-blue-900/30 text-blue-400 border border-blue-800 text-sm font-medium">
                              {bond.status.charAt(0).toUpperCase() + bond.status.slice(1)}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-6 mb-6">
                            <div>
                              <p className="text-sm text-gray-400 mb-1">Principal</p>
                              <p className="text-xl font-semibold text-white">{principal.toFixed(2)} SOL</p>
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
                                      <p>{bond.interestRate}% of principal amount</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </p>
                              <p className="text-xl font-semibold text-white">{interestAmount.toFixed(2)} SOL</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400 mb-1">Total Due</p>
                              <p className="text-xl font-semibold text-white">{totalDue.toFixed(2)} SOL</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-6 mb-6">
                            <div>
                              <p className="text-sm text-gray-400 mb-1">Repaid So Far</p>
                              <p className="text-xl font-semibold text-white">{totalRepaid.toFixed(2)} SOL</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400 mb-1">Remaining</p>
                              <p className="text-xl font-semibold text-white">{remaining.toFixed(2)} SOL</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400 mb-1">Repayment Type</p>
                              <p className="text-xl font-semibold text-white">
                                {bond.repaymentType === 0 ? "Lump Sum" : "Installments"}
                              </p>
                            </div>
                          </div>

                          <div className="mb-6">
                            <div className="flex justify-between mb-2">
                              <p className="text-sm text-gray-400">Repayment Progress</p>
                              <p className="text-sm font-medium text-white">{progressPercentage.toFixed(0)}%</p>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
                                style={{ width: `${progressPercentage}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label htmlFor={`repayment-${bond.id}`} className="block text-sm text-gray-400 mb-2">
                                Repayment Amount (SOL)
                              </label>
                              <div className="flex space-x-2">
                                <Input
                                  id={`repayment-${bond.id}`}
                                  type="number"
                                  placeholder="Enter amount"
                                  value={repaymentAmounts[bond.id] || ""}
                                  onChange={(e) => handleRepaymentAmountChange(bond.id, e.target.value)}
                                  min={0.01}
                                  step={0.01}
                                  max={remaining}
                                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500"
                                />
                                <Button
                                  onClick={() => handleMakeRepayment(bond.id, bond.investors?.[0] || bond.freelancer)}
                                  disabled={isSubmitting[bond.id]}
                                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
                                >
                                  {isSubmitting[bond.id] ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                                    </>
                                  ) : (
                                    "Make Repayment"
                                  )}
                                </Button>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => handlePayFullAmount(bond.id, remaining)}
                              className="w-full border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
                            >
                              Pay Full Amount ({remaining.toFixed(2)} SOL)
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </AnimatePresence>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : repayments.length === 0 ? (
            <Card className="border-gray-800 bg-gray-900/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="text-center py-8 text-gray-400">
                  <p>You haven't made any repayments yet.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-gray-800 bg-gray-900/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Repayment History</CardTitle>
                <CardDescription className="text-gray-400">All repayments you've made on your bonds</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader className="bg-gray-900/50">
                    <TableRow className="border-gray-800 hover:bg-gray-800/50">
                      <TableHead className="text-gray-400">Date</TableHead>
                      <TableHead className="text-gray-400">Bond</TableHead>
                      <TableHead className="text-gray-400">Amount</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                      <TableHead className="text-right text-gray-400">Transaction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repayments.map((repayment) => (
                      <TableRow key={repayment.signature} className="border-gray-800 hover:bg-gray-800/50">
                        <TableCell className="text-gray-300">
                          {new Date(repayment.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-gray-300">#{repayment.bond.slice(-4)}</TableCell>
                        <TableCell className="text-gray-300">{repayment.amount.toFixed(2)} SOL</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              repayment.isCompleted
                                ? "bg-green-900/50 text-green-400 border-green-700"
                                : "bg-blue-900/50 text-blue-400 border-blue-700"
                            }
                          >
                            {repayment.isCompleted ? "Completed" : "Partial"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(getExplorerUrl(repayment.signature), "_blank")}
                            className="border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700 hover:text-white"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
