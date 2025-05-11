"use client"

import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useConnection } from "@solana/wallet-adapter-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { makeInstallmentRepayment } from "@/lib/program"
import { Badge } from "@/components/ui/badge"

interface InstallmentPaymentProps {
  repayment: any
  onSuccess?: () => void
}

export function InstallmentPayment({ repayment, onSuccess }: InstallmentPaymentProps) {
  const { publicKey, sendTransaction, connected, wallet } = useWallet()
  const { connection } = useConnection()
  const [isLoading, setIsLoading] = useState(false)

  const handlePayInstallment = async () => {
    if (!publicKey || !connected || !connection) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to make a payment.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)

      // Make the installment payment
      const { transaction, signers } = await makeInstallmentRepayment(repayment.id, repayment.amount)

      // Get a recent blockhash
      const { blockhash } = await connection.getLatestBlockhash("confirmed")
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      // Sign with any additional signers
      if (signers.length > 0) {
        transaction.partialSign(...signers)
      }

      // Send the transaction
      const signature = await sendTransaction(transaction, connection)
      console.log("Installment payment transaction sent with signature:", signature)

      // Wait for confirmation
      await connection.confirmTransaction(signature, "confirmed")

      toast({
        title: "Payment Successful",
        description: `Your payment of ${repayment.amount} SOL has been processed successfully.`,
      })

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error("Error making installment payment:", error)

      let errorMessage = "Failed to process payment. Please try again."

      if (error.message) {
        if (error.message.includes("User rejected")) {
          errorMessage = "Transaction was rejected in your wallet."
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds to complete the transaction."
        } else {
          errorMessage = `Error: ${error.message}`
        }
      }

      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!repayment) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Missing Information</AlertTitle>
        <AlertDescription>Repayment information is missing.</AlertDescription>
      </Alert>
    )
  }

  // Check if the repayment is already paid
  if (repayment.status === "paid") {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Installment #{repayment.installmentNumber}</CardTitle>
            <Badge variant="outline">Paid</Badge>
          </div>
          <CardDescription>Due: {new Date(repayment.dueDate).toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Amount: {repayment.amount} SOL</p>
          <p className="text-sm text-gray-500">This installment has already been paid.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Installment #{repayment.installmentNumber}</CardTitle>
          <Badge variant={repayment.status === "overdue" ? "destructive" : "default"}>
            {repayment.status === "overdue" ? "Overdue" : "Pending"}
          </Badge>
        </div>
        <CardDescription>Due: {new Date(repayment.dueDate).toLocaleDateString()}</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Amount: {repayment.amount} SOL</p>
        {repayment.status === "overdue" && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Payment Overdue</AlertTitle>
            <AlertDescription>
              This payment is overdue by {Math.floor((Date.now() - repayment.dueDate) / (24 * 60 * 60 * 1000))} days.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handlePayInstallment} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
            </>
          ) : (
            "Make Payment"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
