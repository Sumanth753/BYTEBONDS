"use client"

import type React from "react"

import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { createBond } from "@/lib/program"
import { Loader2, Link2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"

interface CreateBondFormProps {
  onSuccess?: () => void
}

export function CreateBondForm({ onSuccess }: CreateBondFormProps) {
  const { publicKey, connected } = useWallet()
  const [amount, setAmount] = useState<number>(1)
  const [duration, setDuration] = useState<number>(3)
  const [interestRate, setInterestRate] = useState<number>(10)
  const [description, setDescription] = useState<string>("")
  const [repaymentType, setRepaymentType] = useState<string>("lumpSum")
  const [incomeProof, setIncomeProof] = useState<string>("")
  const [isCreating, setIsCreating] = useState<boolean>(false)
  const { toast } = useToast()

  const handleCreateBond = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!connected || !publicKey) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create a bond.",
        variant: "destructive",
      })
      return
    }

    if (!amount || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid bond amount.",
        variant: "destructive",
      })
      return
    }

    if (!description) {
      toast({
        title: "Missing description",
        description: "Please provide a description for your bond.",
        variant: "destructive",
      })
      return
    }

    if (!incomeProof) {
      toast({
        title: "Missing income proof",
        description: "Please provide a link to your income proof.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsCreating(true)
      const repaymentTypeValue = repaymentType === "lumpSum" ? 0 : 1
      const result = await createBond({
        amount,
        duration,
        interestRate,
        incomeProof, // Use the actual income proof URL
        description,
        repaymentType: repaymentTypeValue,
      })

      toast({
        title: "Bond created successfully!",
        description: "Your bond has been created and is now available for investment.",
      })

      // Reset form
      setAmount(1)
      setDuration(3)
      setInterestRate(10)
      setDescription("")
      setIncomeProof("")
      setRepaymentType("lumpSum")

      // Call success callback if provided
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error("Failed to create bond:", error)
      toast({
        title: "Failed to create bond",
        description: error.message || "An error occurred while creating your bond.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  // Animation variants
  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
  }

  return (
    <motion.div variants={formVariants} initial="hidden" animate="visible">
      <Card className="border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Create a New Bond</CardTitle>
          <CardDescription className="text-gray-400">
            Create a bond to get funding for your project. Investors will be able to fund your bond and you'll repay
            them with interest.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateBond} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-gray-300">
                  Bond Amount (SOL)
                </Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  min={0.1}
                  step={0.1}
                  required
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500">The amount of SOL you want to raise</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration" className="text-gray-300">
                  Duration (months)
                </Label>
                <div className="flex items-center gap-4">
                  <Slider
                    id="duration"
                    value={[duration]}
                    min={1}
                    max={12}
                    step={1}
                    onValueChange={(value) => setDuration(value[0])}
                    className="flex-1"
                  />
                  <span className="w-12 text-center text-white">{duration}</span>
                </div>
                <p className="text-xs text-gray-500">How long you need to repay the bond</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interestRate" className="text-gray-300">
                  Interest Rate (%)
                </Label>
                <div className="flex items-center gap-4">
                  <Slider
                    id="interestRate"
                    value={[interestRate]}
                    min={5}
                    max={20}
                    step={1}
                    onValueChange={(value) => setInterestRate(value[0])}
                    className="flex-1"
                  />
                  <span className="w-12 text-center text-white">{interestRate}%</span>
                </div>
                <p className="text-xs text-gray-500">The interest you'll pay to investors</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="incomeProof" className="text-gray-300">
                  Income Proof (URL)
                </Label>
                <div className="relative">
                  <Input
                    id="incomeProof"
                    type="url"
                    value={incomeProof}
                    onChange={(e) => setIncomeProof(e.target.value)}
                    placeholder="https://example.com/income-proof.pdf"
                    required
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500 pl-10"
                  />
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500">
                  Link to a document proving your income (bank statements, contracts, etc.)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="repaymentType" className="text-gray-300">
                  Repayment Type
                </Label>
                <Select value={repaymentType} onValueChange={setRepaymentType}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white focus:ring-purple-500">
                    <SelectValue placeholder="Select repayment type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="lumpSum">Lump Sum (at the end)</SelectItem>
                    <SelectItem value="installments">Monthly Installments</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">How you plan to repay the bond</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-300">
                  Project Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  required
                  placeholder="Describe your project and how you'll use the funds..."
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500">Provide details about your project to attract investors</p>
              </div>
            </div>

            <div className="space-y-2 rounded-lg bg-gray-800/50 p-4 border border-gray-700">
              <h3 className="font-medium text-white">Bond Summary</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-400">Amount:</div>
                <div className="text-white font-medium">{amount.toFixed(2)} SOL</div>
                <div className="text-gray-400">Duration:</div>
                <div className="text-white font-medium">{duration} months</div>
                <div className="text-gray-400">Interest Rate:</div>
                <div className="text-white font-medium">{interestRate}%</div>
                <div className="text-gray-400">Interest Amount:</div>
                <div className="text-white font-medium">{(amount * (interestRate / 100)).toFixed(2)} SOL</div>
                <div className="text-gray-400">Total Repayment:</div>
                <div className="text-white font-medium">{(amount * (1 + interestRate / 100)).toFixed(2)} SOL</div>
                <div className="text-gray-400">Repayment Type:</div>
                <div className="text-white font-medium">
                  {repaymentType === "lumpSum" ? "Lump Sum" : "Monthly Installments"}
                </div>
                {repaymentType === "installments" && (
                  <>
                    <div className="text-gray-400">Monthly Payment:</div>
                    <div className="text-white font-medium">
                      {((amount * (1 + interestRate / 100)) / duration).toFixed(2)} SOL
                    </div>
                  </>
                )}
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleCreateBond}
            disabled={isCreating || !connected}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Bond...
              </>
            ) : (
              "Create Bond"
            )}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
