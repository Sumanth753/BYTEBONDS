"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { fetchInvestments } from "@/lib/program"
import { Loader2, RefreshCw } from "lucide-react"

export function InvestmentsList() {
  const { publicKey, connected } = useWallet()
  const [investments, setInvestments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    loadInvestments()
  }, [publicKey, connected])

  const loadInvestments = async () => {
    try {
      setIsLoading(true)
      if (!publicKey || !connected) {
        setInvestments([])
        return
      }

      // Fetch real investments from the blockchain
      const fetchedInvestments = await fetchInvestments(publicKey.toString())
      setInvestments(fetchedInvestments)
    } catch (error) {
      console.error("Error loading investments:", error)
      setInvestments([])
    } finally {
      setIsLoading(false)
    }
  }

  const refreshInvestments = async () => {
    try {
      setIsRefreshing(true)
      await loadInvestments()
    } catch (error) {
      console.error("Error refreshing investments:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (!connected) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <p className="text-gray-500 dark:text-gray-400">Please connect your wallet to view your investments.</p>
        </CardContent>
      </Card>
    )
  }

  if (investments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <p className="text-gray-500 dark:text-gray-400">You don't have any investments yet.</p>
          <Button variant="outline" className="mt-4" asChild>
            <a href="/investor?tab=available-bonds">Browse Available Bonds</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">My Investments</h2>
        <Button variant="outline" size="sm" onClick={refreshInvestments} disabled={isRefreshing}>
          {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>
      <div className="grid gap-6">
        {investments.map((investment) => (
          <Card key={investment.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Investment in Bond #{investment.bondId.slice(-4)}</CardTitle>
                <Badge variant={investment.status === "completed" ? "outline" : "default"}>
                  {investment.status === "completed" ? "Completed" : "Active"}
                </Badge>
              </div>
              <CardDescription>Freelancer: {investment.freelancer.slice(0, 8)}...</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Invested Amount</p>
                  <p className="font-medium">{investment.investedAmount.toFixed(2)} SOL</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Interest Rate</p>
                  <p className="font-medium">{investment.interestRate}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Duration</p>
                  <p className="font-medium">{investment.duration} months</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Expected Return</p>
                  <p className="font-medium">
                    {(investment.investedAmount * (1 + investment.interestRate / 100)).toFixed(2)} SOL
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Repaid Amount</p>
                  <p className="text-sm font-medium">
                    {investment.repaidAmount.toFixed(2)} SOL (
                    {((investment.repaidAmount / investment.investedAmount) * 100).toFixed(0)}%)
                  </p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div
                    className="bg-primary h-2.5 rounded-full"
                    style={{
                      width: `${Math.min(100, (investment.repaidAmount / investment.investedAmount) * 100).toFixed(
                        0,
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="text-sm">
                <p className="text-gray-500 dark:text-gray-400">
                  Next payment due: {new Date(investment.nextPaymentDate).toLocaleDateString()}
                </p>
              </div>

              <p className="text-xs text-gray-500">
                Invested on: {new Date(investment.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
