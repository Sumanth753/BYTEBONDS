"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useConnection } from "@solana/wallet-adapter-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { investInBond, fetchBonds, RepaymentType } from "@/lib/program"
import { toast } from "@/hooks/use-toast"
import { Loader2, RefreshCw, ExternalLink } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"

type Bond = {
  id: string
  freelancer: string
  amount: number
  duration: number
  interestRate: number
  funded: number
  status: "open" | "funded" | "repaying" | "completed"
  description: string
  createdAt: number
  repaymentType: RepaymentType
  installments?: number
}

interface BondsListProps {
  userType: "freelancer" | "investor"
  onInvestSuccess?: () => void
}

export function BondsList({ userType, onInvestSuccess }: BondsListProps) {
  const { publicKey, sendTransaction, connected, wallet } = useWallet()
  const { connection } = useConnection()
  const [bonds, setBonds] = useState<Bond[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInvesting, setIsInvesting] = useState<string | null>(null)
  const [investmentAmount, setInvestmentAmount] = useState<Record<string, string>>({})
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSignature, setLastSignature] = useState<string | null>(null)

  useEffect(() => {
    loadBonds()
  }, [publicKey, userType, connected])

  const loadBonds = async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (userType === "freelancer" && !publicKey) {
        setBonds([])
        return
      }

      console.log(`Loading bonds for ${userType} with wallet ${publicKey?.toString()}`)

      // Fetch on-chain bonds
      const fetchedBonds = await fetchBonds(userType, publicKey?.toString())
      console.log(`Fetched ${fetchedBonds.length} on-chain bonds`)
      setBonds(fetchedBonds)
    } catch (error) {
      console.error("Error loading bonds:", error)
      setError("Failed to load bonds. Please try again.")
      toast({
        title: "Error",
        description: "Failed to load bonds. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const refreshBonds = async () => {
    try {
      setIsRefreshing(true)
      setError(null)
      await loadBonds()
      toast({
        title: "Refreshed",
        description: "Bond list has been refreshed.",
      })
    } catch (error) {
      console.error("Error refreshing bonds:", error)
      setError("Failed to refresh bonds. Please try again.")
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleInvestmentAmountChange = (bondId: string, value: string) => {
    setInvestmentAmount((prev) => ({ ...prev, [bondId]: value }))
  }

  // Update the handleInvest function to work with the updated investInBond function
  const handleInvest = async (bondId: string) => {
    if (!publicKey || !connected || !connection) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to invest in a bond.",
        variant: "destructive",
      })
      return
    }

    const amount = Number.parseFloat(investmentAmount[bondId] || "0")
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid investment amount.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsInvesting(bondId)
      setError(null)
      setLastSignature(null)

      // Check if user has enough SOL
      const balance = await connection.getBalance(publicKey)
      console.log(`User balance: ${balance / LAMPORTS_PER_SOL} SOL, Investing: ${amount} SOL`)

      if (balance < amount * LAMPORTS_PER_SOL + 10000000) {
        toast({
          title: "Insufficient balance",
          description: "You don't have enough SOL to invest this amount.",
          variant: "destructive",
        })
        setIsInvesting(null)
        return
      }

      // Check if the bond is still available for investment
      console.log("Checking bond status before investment...")
      const bond = bonds.find((b) => b.id === bondId)
      if (!bond) {
        throw new Error("Bond not found. Please refresh the page and try again.")
      }

      if (bond.status !== "open") {
        throw new Error("This bond is no longer open for investment.")
      }

      if (amount > bond.amount - bond.funded) {
        throw new Error(
          `Investment amount exceeds the remaining amount needed (${(bond.amount - bond.funded).toFixed(2)} SOL)`,
        )
      }

      toast({
        title: "Processing Investment...",
        description: `Please approve the transaction in your ${wallet?.adapter.name || "wallet"}.`,
      })

      // Use the updated investInBond function
      console.log("Creating investment transaction using smart contract...")
      const { signature, investmentId } = await investInBond(bondId, amount)

      console.log("Transaction sent with signature:", signature)
      setLastSignature(signature)

      toast({
        title: "Transaction Sent",
        description: "Your investment transaction has been sent to the network.",
      })

      // Wait for confirmation
      try {
        const confirmation = await connection.confirmTransaction(signature, "confirmed")

        if (confirmation.value.err) {
          console.error("Transaction error:", confirmation.value.err)
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
        }

        toast({
          title: "Investment Successful",
          description: `You have successfully invested ${amount} SOL in this bond. The funds have been sent to the freelancer.`,
        })

        // Update the bond status locally to provide immediate feedback
        setBonds((prevBonds) =>
          prevBonds.map((b) => {
            if (b.id === bondId) {
              // Update the funded amount and possibly the status
              const newFunded = b.funded + amount
              const newStatus = newFunded >= b.amount ? "funded" : "open"
              return {
                ...b,
                funded: newFunded,
                status: newStatus,
              }
            }
            return b
          }),
        )

        // Clear the investment amount input
        setInvestmentAmount((prev) => ({ ...prev, [bondId]: "" }))

        // Refresh the bonds list to get the updated status from the blockchain
        setTimeout(() => {
          loadBonds()
        }, 2000)

        // Call onInvestSuccess callback if provided
        if (onInvestSuccess) {
          onInvestSuccess()
        }
      } catch (confirmError) {
        console.error("Error confirming transaction:", confirmError)

        // Even if confirmation fails, the transaction might have succeeded
        toast({
          title: "Transaction May Have Succeeded",
          description:
            "The transaction was sent, but we couldn't confirm if it was successful. Please check your wallet and refresh the page.",
        })

        // Refresh bonds after a short delay
        setTimeout(() => {
          loadBonds()
        }, 5000)
      }
    } catch (error: any) {
      console.error("Error investing in bond:", error)

      // More detailed error logging
      if (error.logs) {
        console.error("Transaction logs:", error.logs)
      }

      let errorMessage = "Failed to invest in bond. Please try again with a smaller amount."

      if (error.message) {
        if (error.message.includes("User rejected")) {
          errorMessage = "Transaction was rejected in your wallet."
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds to complete the transaction."
        } else if (error.message.includes("Transaction simulation failed")) {
          errorMessage = "Transaction simulation failed. The bond may already be fully funded."
        } else if (error.message.includes("Unexpected error")) {
          errorMessage = "Wallet error: Please try reconnecting your wallet or using a different browser."
        } else if (error.message.includes("Custom program error: 0x0")) {
          errorMessage = "Program error: The bond may not be in the correct state for investment."
        } else if (error.message.includes("InstructionError")) {
          errorMessage = "Program instruction error: Please try with a smaller amount (0.1-0.5 SOL)."
        } else {
          errorMessage = `Error: ${error.message}`
        }
      }

      setError(errorMessage)
      toast({
        title: "Investment Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsInvesting(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{userType === "freelancer" ? "My Bonds" : "Available Bonds"}</h2>
        <Button variant="outline" size="sm" onClick={refreshBonds} disabled={isRefreshing}>
          {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {lastSignature && (
        <Alert className="mb-4 bg-green-50 dark:bg-green-900">
          <AlertTitle>Transaction Submitted</AlertTitle>
          <AlertDescription className="flex items-center gap-2">
            <span>View on Solana Explorer:</span>
            <a
              href={`https://explorer.solana.com/tx/${lastSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-blue-600 hover:underline"
            >
              {lastSignature.slice(0, 8)}...{lastSignature.slice(-8)}
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </AlertDescription>
        </Alert>
      )}

      {bonds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              {userType === "freelancer"
                ? connected
                  ? "You haven't created any bonds yet."
                  : "Please connect your wallet to view your bonds."
                : "No bonds are currently available for investment."}
            </p>
            {userType === "freelancer" && connected && (
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => (window.location.href = "/freelancer?tab=create-bond")}
              >
                Create Your First Bond
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {bonds.map((bond) => (
            <Card key={bond.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{bond.description.split(".")[0]}</CardTitle>
                    <CardDescription>
                      {userType === "investor"
                        ? `By ${bond.freelancer.slice(0, 4)}...${bond.freelancer.slice(-4)}`
                        : "Your bond"}
                    </CardDescription>
                  </div>
                  <Badge variant={bond.status === "open" ? "outline" : "default"}>
                    {bond.status === "open"
                      ? "Open for Investment"
                      : bond.status === "funded"
                        ? "Fully Funded"
                        : bond.status === "repaying"
                          ? "Repaying"
                          : "Completed"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Amount</p>
                    <p className="font-medium">{bond.amount.toFixed(2)} SOL</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Duration</p>
                    <p className="font-medium">{bond.duration} months</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Interest Rate</p>
                    <p className="font-medium">{bond.interestRate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Return</p>
                    <p className="font-medium">{(bond.amount * (1 + bond.interestRate / 100)).toFixed(2)} SOL</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Funding Progress</span>
                    <span>{Math.round((bond.funded / bond.amount) * 100)}%</span>
                  </div>
                  <Progress value={(bond.funded / bond.amount) * 100} />
                  <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span>{bond.funded.toFixed(2)} SOL funded</span>
                    <span>{(bond.amount - bond.funded).toFixed(2)} SOL remaining</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Repayment Type</p>
                  <Badge variant="outline">
                    {bond.repaymentType === RepaymentType.LumpSum ? "Lump Sum" : "Monthly Installments"}
                  </Badge>
                </div>

                <p className="text-sm">{bond.description}</p>
                <p className="text-xs text-gray-500">Created: {new Date(bond.createdAt).toLocaleDateString()}</p>
              </CardContent>
              {userType === "investor" && bond.status === "open" && connected && (
                <CardFooter className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="number"
                      placeholder="Amount to invest"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={investmentAmount[bond.id] || ""}
                      onChange={(e) => handleInvestmentAmountChange(bond.id, e.target.value)}
                      disabled={isInvesting === bond.id}
                      min="0.01"
                      max={bond.amount - bond.funded}
                      step="0.01"
                    />
                  </div>
                  <Button onClick={() => handleInvest(bond.id)} disabled={isInvesting === bond.id} className="flex-1">
                    {isInvesting === bond.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Investing...
                      </>
                    ) : (
                      "Invest"
                    )}
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
