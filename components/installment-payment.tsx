"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/use-toast"
import type { SimplifiedBond } from "../lib/simplified-program"
import { Loader2 } from "lucide-react"
import { serverMakeRepayment } from "../app/actions/repayment-actions"

interface InstallmentPaymentProps {
  bond: SimplifiedBond
  onRepaymentComplete: () => void
}

export function InstallmentPayment({ bond, onRepaymentComplete }: InstallmentPaymentProps) {
  const { publicKey } = useWallet()
  const [loading, setLoading] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)
  const [nextInstallmentAmount, setNextInstallmentAmount] = useState<number>(0)
  const [remainingInstallments, setRemainingInstallments] = useState<number>(0)

  useEffect(() => {
    if (bond) {
      // Calculate progress
      const totalAmount = bond.amount
      const repaidAmount = bond.totalRepaid
      const progressPercentage = (repaidAmount / totalAmount) * 100
      setProgress(progressPercentage)

      // Calculate remaining installments
      const installmentAmount = bond.installmentAmount || totalAmount / bond.duration
      const remainingAmount = totalAmount - repaidAmount
      const remaining = Math.ceil(remainingAmount / installmentAmount)
      setRemainingInstallments(remaining)

      // Set next installment amount
      setNextInstallmentAmount(remainingAmount < installmentAmount ? remainingAmount : installmentAmount)
    }
  }, [bond])

  const handlePayInstallment = async () => {
    if (!publicKey) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to make a payment",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      // For simplicity, we're using a dummy investor address
      // In a real application, you would fetch the actual investor from the investments
      const investorAddress = "8YLKoCu4MWp5RvPRpKjzgS5zLxwUbKs9jA1YMF4gdYB5" // Replace with actual investor address

      // Make the repayment using the server action
      const amountInLamports = nextInstallmentAmount * 1_000_000_000 // Convert SOL to lamports
      const result = await serverMakeRepayment(bond.address, investorAddress, amountInLamports)

      if (result.success) {
        toast({
          title: "Installment payment successful",
          description: `Transaction signature: ${result.signature}`,
        })

        // Call the callback
        onRepaymentComplete()
      } else {
        toast({
          title: "Payment failed",
          description: `Error: ${result.error}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error making installment payment:", error)
      toast({
        title: "Payment failed",
        description: `Error: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Installment Payment</CardTitle>
        <CardDescription>Make your next installment payment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Repayment Progress</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Next Payment</p>
            <p className="text-2xl font-bold">{nextInstallmentAmount.toFixed(2)} SOL</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Remaining Installments</p>
            <p className="text-2xl font-bold">{remainingInstallments}</p>
          </div>
        </div>

        <Button onClick={handlePayInstallment} disabled={loading || nextInstallmentAmount <= 0} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Pay Installment"
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
