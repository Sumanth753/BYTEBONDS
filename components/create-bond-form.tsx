"use client"

import type React from "react"
import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useConnection } from "@solana/wallet-adapter-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { createBond, RepaymentType } from "@/lib/program"
import { toast } from "@/hooks/use-toast"
import { Loader2, ExternalLink } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js"
import { simulateTransaction } from "@/lib/account-utils"

interface CreateBondFormProps {
  onSuccess?: () => void
}

export function CreateBondForm({ onSuccess }: CreateBondFormProps) {
  const { publicKey, sendTransaction, connected, wallet } = useWallet()
  const { connection } = useConnection()
  const [isLoading, setIsLoading] = useState(false)
  const [lastSignature, setLastSignature] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    amount: "",
    duration: "12",
    interestRate: "10",
    incomeProof: "",
    description: "",
    repaymentType: RepaymentType.LumpSum.toString(),
  })
  const [bondSeed, setBondSeed] = useState<number | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!publicKey || !connected || !connection) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create a bond.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      setLastSignature(null)

      // Validate inputs
      const amount = Number.parseFloat(formData.amount)
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid amount")
      }

      // Check if user has enough SOL
      const balance = await connection.getBalance(publicKey)
      if (balance < amount * LAMPORTS_PER_SOL + 10000000) {
        toast({
          title: "Insufficient balance",
          description: "You don't have enough SOL to create this bond.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Creating Bond...",
        description: `Please approve the transaction in your ${wallet?.adapter.name || "wallet"}.`,
      })

      // Create the bond transaction
      console.log("Creating bond transaction...")

      const bondParams = {
        amount,
        duration: Number.parseInt(formData.duration),
        interestRate: Number.parseInt(formData.interestRate),
        incomeProof: formData.incomeProof,
        description: formData.description,
        repaymentType: Number.parseInt(formData.repaymentType) as RepaymentType,
      }

      const { transaction, signers, bondId, bondSeed: newBondSeed } = await createBond(bondParams)

      // Store the bond seed for future reference
      if (newBondSeed) {
        setBondSeed(newBondSeed)
      }

      // Get a recent blockhash
      console.log("Getting recent blockhash...")
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed")

      // Create a new transaction with just the instructions from the original
      const newTransaction = new Transaction()
      newTransaction.recentBlockhash = blockhash
      newTransaction.feePayer = publicKey
      newTransaction.lastValidBlockHeight = lastValidBlockHeight

      // Copy instructions from the original transaction
      transaction.instructions.forEach((instruction) => {
        newTransaction.add(instruction)
      })

      // Sign with any additional signers
      if (signers.length > 0) {
        console.log(`Signing transaction with ${signers.length} additional signers...`)
        newTransaction.partialSign(...signers)
      }

      // Log transaction details for debugging
      console.log("Transaction details:", {
        feePayer: newTransaction.feePayer?.toString(),
        recentBlockhash: newTransaction.recentBlockhash,
        instructions: newTransaction.instructions.length,
        signers: signers.map((s) => s.publicKey.toString()),
        bondId,
        bondSeed: newBondSeed,
      })

      // Try to simulate the transaction before sending
      try {
        console.log("Simulating transaction...")
        const simulationSuccess = await simulateTransaction(connection, newTransaction, signers)

        if (!simulationSuccess) {
          console.warn("Transaction simulation failed, but proceeding with actual transaction...")
          // We'll still proceed with the transaction even if simulation fails
          // This is because some wallets might handle things differently than our simulation
        } else {
          console.log("Transaction simulation successful, proceeding with actual transaction...")
        }
      } catch (simError) {
        // If simulation fails, log the error but continue with the transaction
        console.error("Error during transaction simulation:", simError)
        console.warn("Proceeding with transaction despite simulation error")
      }

      // Send the transaction with simplified options
      console.log("Sending transaction to wallet for approval...")
      const signature = await sendTransaction(newTransaction, connection, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
        maxRetries: 2,
      })

      console.log("Bond creation transaction sent with signature:", signature)
      setLastSignature(signature)

      // Wait for confirmation
      console.log("Waiting for transaction confirmation...")
      const confirmation = await connection.confirmTransaction(signature, "confirmed")

      if (confirmation.value.err) {
        console.error("Transaction error:", confirmation.value.err)
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
      }

      toast({
        title: "Bond Created Successfully",
        description: "Your bond has been created and is now available for investors.",
      })

      // Reset form
      setFormData({
        amount: "",
        duration: "12",
        interestRate: "10",
        incomeProof: "",
        description: "",
        repaymentType: RepaymentType.LumpSum.toString(),
      })

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error("Error creating bond:", error)

      // More detailed error logging
      if (error.logs) {
        console.error("Transaction logs:", error.logs)
      }

      let errorMessage = "Failed to create bond. Please try again."

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
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connect Your Wallet</CardTitle>
          <CardDescription>Please connect your wallet to create a bond.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Wallet Required</AlertTitle>
            <AlertDescription>You need to connect a Solana wallet to create a bond.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a New Bond</CardTitle>
        <CardDescription>
          Specify the amount you need and provide proof of your income to create a bond for investors.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              Make sure you have enough SOL in your wallet to create a bond. You'll need the bond amount plus a small
              fee.
            </AlertDescription>
          </Alert>

          {lastSignature && (
            <Alert className="mb-4 bg-green-50 dark:bg-green-900">
              <AlertTitle>Transaction Submitted</AlertTitle>
              <AlertDescription className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
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
                </div>
                {bondSeed && (
                  <div className="text-xs text-gray-600">
                    Bond Seed: {bondSeed} (Save this if you need to reference this bond later)
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (SOL)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                placeholder="1.0"
                value={formData.amount}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500">The amount you need upfront</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (Months)</Label>
              <Select
                value={formData.duration}
                onValueChange={(value) => handleSelectChange("duration", value)}
                disabled={isLoading}
              >
                <SelectTrigger id="duration">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 months</SelectItem>
                  <SelectItem value="6">6 months</SelectItem>
                  <SelectItem value="12">12 months</SelectItem>
                  <SelectItem value="24">24 months</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">Repayment period</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interestRate">Interest Rate (%)</Label>
            <Select
              value={formData.interestRate}
              onValueChange={(value) => handleSelectChange("interestRate", value)}
              disabled={isLoading}
            >
              <SelectTrigger id="interestRate">
                <SelectValue placeholder="Select interest rate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5%</SelectItem>
                <SelectItem value="10">10%</SelectItem>
                <SelectItem value="15">15%</SelectItem>
                <SelectItem value="20">20%</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">Higher rates attract investors faster</p>
          </div>

          <div className="space-y-2">
            <Label>Repayment Type</Label>
            <RadioGroup
              value={formData.repaymentType}
              onValueChange={(value) => handleSelectChange("repaymentType", value)}
              className="flex flex-col space-y-1"
              disabled={isLoading}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={RepaymentType.LumpSum.toString()} id="lumpsum" />
                <Label htmlFor="lumpsum" className="font-normal">
                  Lump Sum (Pay entire amount at once)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={RepaymentType.Installments.toString()} id="installments" />
                <Label htmlFor="installments" className="font-normal">
                  Monthly Installments
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-gray-500">Choose how you want to repay the bond after it's funded</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="incomeProof">Income Proof (URL)</Label>
            <Input
              id="incomeProof"
              name="incomeProof"
              placeholder="https://example.com/income-proof.pdf"
              value={formData.incomeProof}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">
              Link to a document proving your income (bank statements, contracts, etc.)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe your work, income stability, and how you plan to use the funds..."
              value={formData.description}
              onChange={handleChange}
              rows={4}
              required
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Bond...
              </>
            ) : (
              "Create Bond"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
