"use client"

import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useConnection } from "@solana/wallet-adapter-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader2, ExternalLink } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { makeLumpSumRepayment } from "@/lib/program"
import type { Transaction } from "@solana/web3.js"
import { getProgram } from "@/lib/utils"
import { PublicKey, SystemProgram } from "@solana/web3.js"

interface RepaymentOptionsProps {
  bond: any
  investment: any
  onSuccess?: () => void
}

export function RepaymentOptions({ bond, investment, onSuccess }: RepaymentOptionsProps) {
  const { publicKey, sendTransaction, connected, wallet } = useWallet()
  const { connection } = useConnection()
  const [isLoading, setIsLoading] = useState(false)
  const [repaymentType, setRepaymentType] = useState<"lumpsum" | "installments">("lumpsum")
  const [installments, setInstallments] = useState("3")
  const [lastSignature, setLastSignature] = useState<string | null>(null)

  // Update the handleRepay function to work with the updated makeLumpSumRepayment function
  const handleRepay = async () => {
    if (!publicKey || !connected || !connection) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to make a repayment.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      setLastSignature(null)

      if (repaymentType === "lumpsum") {
        // Make a lump sum repayment using the updated function
        const { signature } = await makeLumpSumRepayment(bond.id, investment.id)

        console.log("Lump sum repayment transaction sent with signature:", signature)
        setLastSignature(signature)

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(signature, "confirmed")

        if (confirmation.value.err) {
          console.error("Transaction error:", confirmation.value.err)
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
        }

        toast({
          title: "Repayment Successful",
          description: "Your lump sum repayment has been processed successfully.",
        })
      } else {
        // Create a repayment plan with installments
        // Update this to use the Anchor program methods directly
        const program = await getProgram({
          publicKey,
          signTransaction: async (tx: Transaction) => {
            if (!(window as any).solana?.signTransaction) {
              throw new Error("Wallet does not support signTransaction")
            }
            return (window as any).solana.signTransaction(tx)
          },
          signAllTransactions: async (txs: Transaction[]) => {
            if (!(window as any).solana?.signAllTransactions) {
              throw new Error("Wallet does not support signAllTransactions")
            }
            return (window as any).solana.signAllTransactions(txs)
          },
        })

        const bondPublicKey = new PublicKey(bond.id)
        const installmentsNum = Number.parseInt(installments)

        const signature = await program.methods
          .createRepaymentPlan(installmentsNum)
          .accounts({
            freelancer: publicKey,
            bond: bondPublicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc()

        console.log("Repayment plan transaction sent with signature:", signature)
        setLastSignature(signature)

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(signature, "confirmed")

        if (confirmation.value.err) {
          console.error("Transaction error:", confirmation.value.err)
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
        }

        toast({
          title: "Repayment Plan Created",
          description: `Your repayment plan with ${installments} installments has been created.`,
        })
      }

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error("Error making repayment:", error)

      let errorMessage = "Failed to process repayment. Please try again."

      if (error.message) {
        if (error.message.includes("User rejected")) {
          errorMessage = "Transaction was rejected in your wallet."
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds to complete the transaction."
        } else if (error.message.includes("Unexpected error")) {
          errorMessage = "Wallet error: Please try reconnecting your wallet or using a different browser."
        } else {
          errorMessage = `Error: ${error.message}`
        }
      }

      toast({
        title: "Repayment Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!bond || !investment) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Missing Information</AlertTitle>
        <AlertDescription>Bond or investment information is missing.</AlertDescription>
      </Alert>
    )
  }

  // Check if the bond is funded and ready for repayment
  const isFunded = bond.status === "funded"
  if (!isFunded) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Bond Not Ready</AlertTitle>
        <AlertDescription>
          This bond is not yet fully funded. Repayment options will be available once the bond is funded.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Repayment Options</CardTitle>
        <CardDescription>Choose how you want to repay this bond</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Repayment Method</Label>
          <RadioGroup
            value={repaymentType}
            onValueChange={(value: "lumpsum" | "installments") => setRepaymentType(value)}
            className="flex flex-col space-y-1"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="lumpsum" id="r-lumpsum" />
              <Label htmlFor="r-lumpsum" className="font-normal">
                Lump Sum Payment
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="installments" id="r-installments" />
              <Label htmlFor="r-installments" className="font-normal">
                Monthly Installments
              </Label>
            </div>
          </RadioGroup>
        </div>

        {repaymentType === "installments" && (
          <div className="space-y-2">
            <Label htmlFor="installments">Number of Installments</Label>
            <Input
              id="installments"
              type="number"
              min="1"
              max={bond.duration}
              value={installments}
              onChange={(e) => setInstallments(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Choose how many monthly payments you want to make (maximum: {bond.duration})
            </p>
          </div>
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

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Payment Details</AlertTitle>
          <AlertDescription>
            {repaymentType === "lumpsum" ? (
              <div>
                <p>
                  You will pay the full amount of {bond.amount} SOL plus {bond.interestRate}% interest (
                  {(bond.amount * (1 + bond.interestRate / 100)).toFixed(2)} SOL total) in one payment.
                </p>
              </div>
            ) : (
              <div>
                <p>
                  You will make {installments} monthly payments of{" "}
                  {((bond.amount * (1 + bond.interestRate / 100)) / Number.parseInt(installments)).toFixed(2)} SOL each.
                </p>
                <p>Total repayment: {(bond.amount * (1 + bond.interestRate / 100)).toFixed(2)} SOL</p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter>
        <Button onClick={handleRepay} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
            </>
          ) : (
            `Confirm ${repaymentType === "lumpsum" ? "Payment" : "Repayment Plan"}`
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
