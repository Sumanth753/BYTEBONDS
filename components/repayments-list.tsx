"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useConnection } from "@solana/wallet-adapter-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { fetchRepayments, makeInstallmentRepayment } from "@/lib/program"
import { toast } from "@/hooks/use-toast"
import { Loader2, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RepaymentOptions } from "./repayment-options"

type Repayment = {
  id: string
  bondId: string
  amount: number
  dueDate: number
  status: "pending" | "paid" | "overdue"
  createdAt: number
  installmentNumber?: number
  isInstallment?: boolean
}

export function RepaymentsList() {
  const { publicKey, sendTransaction, connected, wallet } = useWallet()
  const { connection } = useConnection()
  const [repayments, setRepayments] = useState<Repayment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingPayment, setProcessingPayment] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("pending")

  useEffect(() => {
    loadRepayments()
  }, [publicKey, connected])

  const loadRepayments = async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (!publicKey || !connected) {
        setRepayments([])
        return
      }

      // Fetch real repayments from the blockchain
      const fetchedRepayments = await fetchRepayments(publicKey.toString())
      setRepayments(fetchedRepayments)
    } catch (error) {
      console.error("Error loading repayments:", error)
      setError("Failed to load repayments. Please try again.")
      toast({
        title: "Error",
        description: "Failed to load repayments. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const refreshRepayments = async () => {
    try {
      setIsRefreshing(true)
      setError(null)
      await loadRepayments()
      toast({
        title: "Refreshed",
        description: "Repayment list has been refreshed.",
      })
    } catch (error) {
      console.error("Error refreshing repayments:", error)
      setError("Failed to refresh repayments. Please try again.")
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleMakeRepayment = async (repaymentId: string) => {
    if (!publicKey || !sendTransaction || !connected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to make a repayment.",
        variant: "destructive",
      })
      return
    }

    try {
      setProcessingPayment(repaymentId)
      setError(null)

      // Find the repayment to get the amount
      const repayment = repayments.find((r) => r.id === repaymentId)
      if (!repayment) {
        throw new Error("Repayment not found")
      }

      toast({
        title: "Processing Payment...",
        description: `Please approve the transaction in your ${wallet?.adapter.name || "wallet"}.`,
      })

      // Get the transaction for making the repayment
      const { transaction, signers } = await makeInstallmentRepayment(repaymentId, repayment.amount)

      // Get a recent blockhash
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      // Sign with any additional signers
      if (signers.length > 0) {
        transaction.partialSign(...signers)
      }

      // Send the transaction
      const signature = await sendTransaction(transaction, connection)
      console.log("Repayment transaction sent with signature:", signature)

      // Wait for confirmation
      await connection.confirmTransaction(signature)

      toast({
        title: "Payment Successful",
        description: "Your repayment has been processed successfully.",
      })

      await loadRepayments()
    } catch (error: any) {
      console.error("Error making repayment:", error)

      // Log additional details if available
      if (error.logs) {
        console.error("Transaction logs:", error.logs)
      }

      let errorMessage = "Failed to process repayment"

      if (error.message) {
        if (error.message.includes("User rejected")) {
          errorMessage = "Transaction was rejected in your wallet"
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds to complete the transaction"
        } else {
          errorMessage = `Transaction error: ${error.message}`
        }
      }

      setError(error instanceof Error ? error.message : "Failed to process repayment. Please try again.")
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to process repayment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingPayment(null)
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
          <p className="text-gray-500 dark:text-gray-400">Please connect your wallet to view your repayments.</p>
        </CardContent>
      </Card>
    )
  }

  // Filter repayments based on active tab
  const filteredRepayments = repayments.filter((repayment) => {
    if (activeTab === "pending") {
      return repayment.status === "pending" || repayment.status === "overdue"
    } else if (activeTab === "paid") {
      return repayment.status === "paid"
    } else if (activeTab === "installments") {
      return repayment.isInstallment === true
    } else if (activeTab === "lumpsum") {
      return repayment.isInstallment === false
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">My Repayments</h2>
        <Button variant="outline" size="sm" onClick={refreshRepayments} disabled={isRefreshing}>
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

      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="installments">Installments</TabsTrigger>
          <TabsTrigger value="lumpsum">Lump Sum</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredRepayments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  {activeTab === "pending"
                    ? "You don't have any pending repayments."
                    : activeTab === "paid"
                      ? "You don't have any paid repayments."
                      : activeTab === "installments"
                        ? "You don't have any installment repayments."
                        : "You don't have any lump sum repayments."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {filteredRepayments.map((repayment) => (
                <Card key={repayment.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>
                        {repayment.isInstallment ? `Installment #${repayment.installmentNumber}` : "Lump Sum Repayment"}
                      </CardTitle>
                      <Badge
                        variant={
                          repayment.status === "paid"
                            ? "outline"
                            : repayment.status === "overdue"
                              ? "destructive"
                              : "default"
                        }
                      >
                        {repayment.status === "paid" ? "Paid" : repayment.status === "overdue" ? "Overdue" : "Pending"}
                      </Badge>
                    </div>
                    <CardDescription>Bond #{repayment.bondId.slice(-4)}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Amount</p>
                        <p className="font-medium">{repayment.amount.toFixed(2)} SOL</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Due Date</p>
                        <p className="font-medium">{new Date(repayment.dueDate).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {repayment.status !== "paid" && (
                      <div className="text-sm">
                        {repayment.status === "overdue" ? (
                          <p className="text-red-500">
                            This payment is overdue by{" "}
                            {Math.floor((Date.now() - repayment.dueDate) / (24 * 60 * 60 * 1000))} days.
                          </p>
                        ) : (
                          <p>Due in {Math.floor((repayment.dueDate - Date.now()) / (24 * 60 * 60 * 1000))} days.</p>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-gray-500">
                      Created on: {new Date(repayment.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                  {repayment.status !== "paid" && (
                    <CardFooter>
                      <Button
                        className="w-full"
                        onClick={() => handleMakeRepayment(repayment.id)}
                        disabled={processingPayment === repayment.id}
                      >
                        {processingPayment === repayment.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                          </>
                        ) : (
                          "Make Payment"
                        )}
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Repayment Options Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Set Up New Repayment</h2>
        {repayments.length > 0 && repayments[0].bondId ? (
          <RepaymentOptions
            bond={{
              id: repayments[0].bondId,
              amount: 5, // This will be fetched from the actual bond
              interestRate: 10,
              duration: 12,
              status: "funded",
            }}
            investment={{
              id: "investment-id", // This will be fetched from the actual investment
              amount: 5,
            }}
            onSuccess={refreshRepayments}
          />
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Bonds Found</AlertTitle>
            <AlertDescription>
              You need to have a funded bond before you can set up repayments. Create a bond and wait for it to be
              funded.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
