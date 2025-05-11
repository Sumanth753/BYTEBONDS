"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { setUserRole } from "@/lib/user-role"
import { Briefcase, TrendingUp, Loader2 } from "lucide-react"

interface RoleSelectorProps {
  walletAddress: string
}

export function RoleSelector({ walletAddress }: RoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<"freelancer" | "investor" | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleRoleSelect = (role: "freelancer" | "investor") => {
    setSelectedRole(role)
  }

  const handleContinue = async () => {
    if (!selectedRole) return

    setIsSubmitting(true)
    try {
      // Save the user's role
      setUserRole(walletAddress, selectedRole)

      // Redirect to the appropriate dashboard
      router.push(selectedRole === "freelancer" ? "/freelancer" : "/investor")
    } catch (error) {
      console.error("Error setting user role:", error)
      setIsSubmitting(false)
    }
  }

  const cardVariants = {
    selected: {
      scale: 1.05,
      borderColor: "rgba(168, 85, 247, 0.5)",
      boxShadow: "0 0 15px rgba(168, 85, 247, 0.3)",
    },
    notSelected: {
      scale: 1,
      borderColor: "rgba(31, 41, 55, 0.5)",
      boxShadow: "none",
    },
  }

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Choose Your Role</h2>
        <p className="text-gray-400">Select how you want to use ByteBonds. You can change your role later.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <motion.div
          variants={cardVariants}
          animate={selectedRole === "freelancer" ? "selected" : "notSelected"}
          whileHover={{ y: -5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card
            className={`border-gray-800 bg-gray-900/50 backdrop-blur-sm cursor-pointer h-full transition-all ${
              selectedRole === "freelancer" ? "border-purple-700/50 shadow-lg shadow-purple-900/20" : ""
            }`}
            onClick={() => handleRoleSelect("freelancer")}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-purple-900/30 flex items-center justify-center">
                  <Briefcase className="w-8 h-8 text-purple-400" />
                </div>
              </div>
              <CardTitle className="text-center text-white">Freelancer</CardTitle>
              <CardDescription className="text-center text-gray-400">
                Create bonds and get funding for your projects
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center text-gray-300">
              <ul className="space-y-2 text-sm">
                <li>• Create bonds for your projects</li>
                <li>• Receive funding from investors</li>
                <li>• Build your ByteScore reputation</li>
                <li>• Make repayments on your terms</li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={cardVariants}
          animate={selectedRole === "investor" ? "selected" : "notSelected"}
          whileHover={{ y: -5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card
            className={`border-gray-800 bg-gray-900/50 backdrop-blur-sm cursor-pointer h-full transition-all ${
              selectedRole === "investor" ? "border-blue-700/50 shadow-lg shadow-blue-900/20" : ""
            }`}
            onClick={() => handleRoleSelect("investor")}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-blue-900/30 flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-blue-400" />
                </div>
              </div>
              <CardTitle className="text-center text-white">Investor</CardTitle>
              <CardDescription className="text-center text-gray-400">
                Invest in freelancer bonds and earn returns
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center text-gray-300">
              <ul className="space-y-2 text-sm">
                <li>• Browse available bonds</li>
                <li>• Invest in promising projects</li>
                <li>• Earn interest on your investments</li>
                <li>• Track your portfolio performance</li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="mt-8">
        <Button
          className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 min-w-[200px]"
          onClick={handleContinue}
          disabled={!selectedRole || isSubmitting}
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isSubmitting ? "Processing..." : "Continue"}
        </Button>
      </div>
    </div>
  )
}
