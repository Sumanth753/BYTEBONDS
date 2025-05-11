"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import type { RepaymentType, SimplifiedBond } from "../lib/simplified-program"
import { Loader2 } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { serverMakeRepayment, serverSetRepaymentType } from "../app/actions/repayment-actions"

interface RepaymentOptionsProps {
  bond: SimplifiedBond
  onRepaymentComplete: () => void
}

export function RepaymentOptions({ bond, onRepaymentComplete }: RepaymentOptionsProps) {
  const { publicKey } = useWallet()
  const [amount, setAmount] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [repaymentType, setRepaymentTypeState] = useState<RepaymentType>(bond.repaymentType || "LumpSum")
  const [installmentAmount, setInstallmentAmount] = useState<string>("")
  const [remainingAmount, setRemainingAmount] = useState<number>(bond.remainingAmount || 0)

  useEffect(() => {
    setRemainingAmount(bond.remainingAmount || 0)
  }, [bond])

  const handleRepayment = async () => {
    if (!publicKey) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to make a repayment",
        variant: "destructive",
      })
      return
    }

    if (!amount || Number.parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
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
      const amountInLamports = Number.parseFloat(amount) * 1_000_000_000 // Convert SOL to lamports
      const result = await serverMakeRepayment(bond.address, investorAddress, amountInLamports)

      if (result.success) {
        toast({
          title: "Repayment successful",
          description: `Transaction signature: ${result.signature}`,
        })

        // Update the remaining amount
        setRemainingAmount((prev) => Math.max(0, prev - Number.parseFloat(amount)))

        // Clear the input
        setAmount("")

        // Call the callback
        onRepaymentComplete()
      } else {
        toast({
          title: "Repayment failed",
          description: `Error: ${result.error}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error making repayment:", error)
      toast({
        title: "Repayment failed",
        description: `Error: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSetRepaymentType = async () => {
    if (!publicKey) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to set repayment type",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      // Set the repayment type using the server action
      const result = await serverSetRepaymentType(bond.address, repaymentType)

      if (result.success) {
        toast({
          title: "Repayment type set successfully",
          description: `Transaction signature: ${result.signature}`,
        })

        // If installment type is selected and installment amount is provided
        if (repaymentType === "Installments" && installmentAmount) {
          // In a real application, you would update the installment amount in the bond
          // For now, we'll just show a toast
          toast({
            title: "Installment amount set",
            description: `Installment amount: ${installmentAmount} SOL`,
          })
        }

        // Call the callback
        onRepaymentComplete()
      } else {
        toast({
          title: "Failed to set repayment type",
          description: `Error: ${result.error}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error setting repayment type:", error)
      toast({
        title: "Failed to set repayment type",
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
        <CardTitle>Repayment Options</CardTitle>
        <CardDescription>
          Make a repayment on your bond. Remaining amount: {remainingAmount.toFixed(2)} SOL
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="repay">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="repay">Make Repayment</TabsTrigger>
            <TabsTrigger value="settings">Repayment Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="repay" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (SOL)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <Button
              onClick={handleRepayment}
              disabled={loading || !amount || Number.parseFloat(amount) <= 0}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Make Repayment"
              )}
            </Button>
          </TabsContent>
          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-2">
              <Label>Repayment Type</Label>
              <RadioGroup
                value={repaymentType}
                onValueChange={(value) => setRepaymentTypeState(value as RepaymentType)}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="LumpSum" id="lumpsum" />
                  <Label htmlFor="lumpsum">Lump Sum</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Installments" id="installments" />
                  <Label htmlFor="installments">Installments</Label>
                </div>
              </RadioGroup>
            </div>

            {repaymentType === "Installments" && (
              <div className="space-y-2">
                <Label htmlFor="installmentAmount">Installment Amount (SOL)</Label>
                <Input
                  id="installmentAmount"
                  type="number"
                  placeholder="Enter installment amount"
                  value={installmentAmount}
                  onChange={(e) => setInstallmentAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
            )}

            <Button
              onClick={handleSetRepaymentType}
              disabled={
                loading ||
                (repaymentType === "Installments" && (!installmentAmount || Number.parseFloat(installmentAmount) <= 0))
              }
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
