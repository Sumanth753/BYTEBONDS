"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { InfoIcon } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { motion } from "framer-motion"
import { calculateByteScore } from "@/lib/bytescore"

interface ByteScoreData {
  score: number
  breakdown: {
    walletAge: number
    transactionFrequency: number
    volume: number
    diversity: number
    contractUsage: number
    repaymentHistory: number
    redFlags: number
  }
  metrics: {
    walletAgeDays: number
    transactionCount: number
    volumeSOL: number
    uniqueTokens: number
    contractInteractions: number
    repaymentRatio: number
    failedTransactionRatio: number
    inactiveDays: number
  }
}

export function ByteScoreCard({ walletAddress }: { walletAddress?: string }) {
  const { publicKey } = useWallet()
  const [byteScoreData, setByteScoreData] = useState<ByteScoreData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Use the provided wallet address or the connected wallet
  const address = walletAddress || publicKey?.toString()

  useEffect(() => {
    async function fetchByteScore() {
      if (!address) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Basic validation before making the API call
        try {
          new PublicKey(address)
        } catch (err) {
          setError("Invalid wallet address format")
          setIsLoading(false)
          return
        }

        // Use the API endpoint to get ByteScore data
        const response = await fetch(`/api/bytescore?address=${address}`)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
          throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        setByteScoreData(data)
      } catch (err) {
        console.error("Error fetching ByteScore:", err)

        // Fallback to direct calculation if API fails
        try {
          const scoreData = await calculateByteScore(address)
          setByteScoreData(scoreData)
        } catch (calcErr) {
          console.error("Error calculating ByteScore directly:", calcErr)
          setError(err instanceof Error ? err.message : "Failed to load ByteScore")
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchByteScore()
  }, [address])

  // Get score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500"
    if (score >= 60) return "bg-blue-500"
    if (score >= 40) return "bg-yellow-500"
    return "bg-red-500"
  }

  // Get risk level based on score
  const getRiskLevel = (score: number) => {
    if (score >= 80) return "Very Low Risk"
    if (score >= 60) return "Low Risk"
    if (score >= 40) return "Moderate Risk"
    if (score >= 20) return "High Risk"
    return "Very High Risk"
  }

  // Detailed score content for the modal
  const DetailedScoreContent = () => {
    if (!byteScoreData) return null

    return (
      <>
        <div className="flex flex-col items-center justify-center space-y-2 mb-4">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-gray-800">
            <span className={`text-3xl font-bold text-white`}>{byteScoreData.score}</span>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-white">{getRiskLevel(byteScoreData.score)}</p>
            <p className="text-xs text-gray-400">
              {byteScoreData.score >= 60
                ? "This wallet has a good reputation"
                : "This wallet needs to build more reputation"}
            </p>
          </div>
        </div>

        <Tabs defaultValue="breakdown" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800/50">
            <TabsTrigger
              value="breakdown"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              Score Breakdown
            </TabsTrigger>
            <TabsTrigger
              value="metrics"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              Metrics
            </TabsTrigger>
          </TabsList>
          <TabsContent value="breakdown" className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-xs text-gray-300">Wallet Age</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoIcon className="ml-1 h-3 w-3 text-gray-500" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-800 text-white border-gray-700">
                        <p>Based on how long this wallet has been active (15%)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="text-xs font-medium text-gray-300">{byteScoreData.breakdown.walletAge} pts</span>
              </div>
              <Progress value={(byteScoreData.breakdown.walletAge / 15) * 100} className="h-1 bg-gray-800">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
                  style={{ width: `${(byteScoreData.breakdown.walletAge / 15) * 100}%` }}
                />
              </Progress>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-xs text-gray-300">Transaction Frequency</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoIcon className="ml-1 h-3 w-3 text-gray-500" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-800 text-white border-gray-700">
                        <p>Based on how frequently this wallet transacts (20%)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="text-xs font-medium text-gray-300">
                  {byteScoreData.breakdown.transactionFrequency} pts
                </span>
              </div>
              <Progress value={(byteScoreData.breakdown.transactionFrequency / 20) * 100} className="h-1 bg-gray-800">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
                  style={{ width: `${(byteScoreData.breakdown.transactionFrequency / 20) * 100}%` }}
                />
              </Progress>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-xs text-gray-300">Transaction Volume</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoIcon className="ml-1 h-3 w-3 text-gray-500" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-800 text-white border-gray-700">
                        <p>Based on the volume of transactions (20%)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="text-xs font-medium text-gray-300">{byteScoreData.breakdown.volume} pts</span>
              </div>
              <Progress value={(byteScoreData.breakdown.volume / 20) * 100} className="h-1 bg-gray-800">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
                  style={{ width: `${(byteScoreData.breakdown.volume / 20) * 100}%` }}
                />
              </Progress>
            </div>

            {/* Other breakdown items... */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-xs text-gray-300">Wallet Diversity</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoIcon className="ml-1 h-3 w-3 text-gray-500" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-800 text-white border-gray-700">
                        <p>Based on the variety of tokens and assets (10%)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="text-xs font-medium text-gray-300">{byteScoreData.breakdown.diversity} pts</span>
              </div>
              <Progress value={(byteScoreData.breakdown.diversity / 10) * 100} className="h-1 bg-gray-800">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
                  style={{ width: `${(byteScoreData.breakdown.diversity / 10) * 100}%` }}
                />
              </Progress>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-xs text-gray-300">Contract Usage</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoIcon className="ml-1 h-3 w-3 text-gray-500" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-800 text-white border-gray-700">
                        <p>Based on interactions with smart contracts (10%)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="text-xs font-medium text-gray-300">{byteScoreData.breakdown.contractUsage} pts</span>
              </div>
              <Progress value={(byteScoreData.breakdown.contractUsage / 10) * 100} className="h-1 bg-gray-800">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
                  style={{ width: `${(byteScoreData.breakdown.contractUsage / 10) * 100}%` }}
                />
              </Progress>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-xs text-gray-300">Repayment History</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoIcon className="ml-1 h-3 w-3 text-gray-500" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-800 text-white border-gray-700">
                        <p>Based on ByteBonds repayment behavior (20%)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="text-xs font-medium text-gray-300">
                  {byteScoreData.breakdown.repaymentHistory} pts
                </span>
              </div>
              <Progress value={(byteScoreData.breakdown.repaymentHistory / 20) * 100} className="h-1 bg-gray-800">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
                  style={{ width: `${(byteScoreData.breakdown.repaymentHistory / 20) * 100}%` }}
                />
              </Progress>
            </div>

            {byteScoreData.breakdown.redFlags > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-xs text-red-400">Red Flags</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoIcon className="ml-1 h-3 w-3 text-gray-500" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-800 text-white border-gray-700">
                          <p>Penalties for failed transactions, inactivity, etc.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <span className="text-xs font-medium text-red-400">-{byteScoreData.breakdown.redFlags} pts</span>
                </div>
                <Progress value={(byteScoreData.breakdown.redFlags / 20) * 100} className="h-1 bg-gray-800">
                  <div
                    className="h-full bg-red-500"
                    style={{ width: `${(byteScoreData.breakdown.redFlags / 20) * 100}%` }}
                  />
                </Progress>
              </div>
            )}
          </TabsContent>
          <TabsContent value="metrics" className="pt-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-gray-800 p-2">
                  <p className="text-xs text-gray-400">Wallet Age</p>
                  <p className="text-sm font-medium text-white">{byteScoreData.metrics.walletAgeDays} days</p>
                </div>
                <div className="rounded-lg bg-gray-800 p-2">
                  <p className="text-xs text-gray-400">Transaction Count</p>
                  <p className="text-sm font-medium text-white">{byteScoreData.metrics.transactionCount}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-gray-800 p-2">
                  <p className="text-xs text-gray-400">Volume (SOL)</p>
                  <p className="text-sm font-medium text-white">{byteScoreData.metrics.volumeSOL.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-gray-800 p-2">
                  <p className="text-xs text-gray-400">Unique Tokens</p>
                  <p className="text-sm font-medium text-white">{byteScoreData.metrics.uniqueTokens}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-gray-800 p-2">
                  <p className="text-xs text-gray-400">Contract Interactions</p>
                  <p className="text-sm font-medium text-white">{byteScoreData.metrics.contractInteractions}</p>
                </div>
                <div className="rounded-lg bg-gray-800 p-2">
                  <p className="text-xs text-gray-400">Repayment Ratio</p>
                  <p className="text-sm font-medium text-white">
                    {(byteScoreData.metrics.repaymentRatio * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-gray-800 p-2">
                  <p className="text-xs text-gray-400">Failed TX Ratio</p>
                  <p className="text-sm font-medium text-white">
                    {(byteScoreData.metrics.failedTransactionRatio * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="rounded-lg bg-gray-800 p-2">
                  <p className="text-xs text-gray-400">Inactive Days</p>
                  <p className="text-sm font-medium text-white">{byteScoreData.metrics.inactiveDays}</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </>
    )
  }

  return (
    <>
      <motion.div className="group" whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
        <Card className="h-full border-gray-800 bg-gray-900/50 backdrop-blur-sm transition-all group-hover:border-purple-700/50 group-hover:shadow-lg group-hover:shadow-purple-900/20">
          <CardContent className="flex flex-col p-6">
            <div className="text-sm font-medium text-gray-300">ByteScore</div>
            {isLoading ? (
              <div className="mt-2 flex items-center">
                <Skeleton className="h-12 w-12 rounded-full bg-gray-800" />
              </div>
            ) : error ? (
              <div className="mt-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800">
                  <span className="text-lg font-bold text-gray-500">N/A</span>
                </div>
                <div className="mt-1 text-xs text-gray-500">Unable to calculate</div>
              </div>
            ) : (
              <div className="mt-2 flex flex-col">
                <div
                  className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-full text-white ${getScoreColor(byteScoreData?.score || 0)}`}
                  onClick={() => setIsDialogOpen(true)}
                >
                  <span className="text-lg font-bold">{byteScoreData?.score || 0}</span>
                </div>
                <div className="mt-1 text-xs text-gray-500">Wallet reputation</div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>ByteScore Details</DialogTitle>
          </DialogHeader>
          <DetailedScoreContent />
        </DialogContent>
      </Dialog>
    </>
  )
}
