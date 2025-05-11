"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { WalletMultiButton } from "@/components/wallet-multi-button"
import { useWallet } from "@solana/wallet-adapter-react"
import { RoleSelector } from "@/components/role-selector"
import { getUserRole } from "@/lib/user-role"

export default function Home() {
  const { connected, publicKey } = useWallet()
  const [showRoleSelector, setShowRoleSelector] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (connected && publicKey) {
      const userRole = getUserRole(publicKey.toString())

      if (userRole === "freelancer") {
        router.push("/freelancer")
      } else if (userRole === "investor") {
        router.push("/investor")
      } else {
        setShowRoleSelector(true)
      }
    } else {
      setShowRoleSelector(false)
    }
  }, [connected, publicKey, router])

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <header className="border-b border-gray-800">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <motion.span
              className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              ByteBonds
            </motion.span>
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link href="/" className="text-sm font-medium text-purple-400 transition-colors">
              Home
            </Link>
            <Link href="/freelancer" className="text-sm font-medium hover:text-purple-400 transition-colors">
              For Freelancers
            </Link>
            <Link href="/investor" className="text-sm font-medium hover:text-purple-400 transition-colors">
              For Investors
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <WalletMultiButton />
          </div>
        </div>
      </header>
      <main className="flex-1">
        <AnimatePresence mode="wait">
          {showRoleSelector ? (
            <motion.section
              key="role-selector"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="container py-12 md:py-24 lg:py-32"
            >
              <RoleSelector walletAddress={publicKey?.toString() || ""} />
            </motion.section>
          ) : (
            <motion.section
              key="hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full py-12 md:py-24 lg:py-32"
            >
              <div className="container px-4 md:px-6">
                <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
                  <div className="flex flex-col justify-center space-y-4">
                    <div className="space-y-2">
                      <motion.h1
                        className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        Decentralized Funding for Freelancers
                      </motion.h1>
                      <motion.p
                        className="max-w-[600px] text-gray-400 md:text-xl"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        ByteBonds connects freelancers with investors through blockchain-powered bonds. Get funded for
                        your projects or invest in talented freelancers.
                      </motion.p>
                    </div>
                    <motion.div
                      className="flex flex-col gap-2 min-[400px]:flex-row"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <WalletMultiButton />
                    </motion.div>
                  </div>
                  <motion.div
                    className="flex items-center justify-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
                  >
                    <Image
                      src="/blockchain-freelance-platform.png"
                      alt="ByteBonds Platform"
                      width={600}
                      height={400}
                      className="rounded-lg object-cover border border-gray-800 shadow-xl shadow-purple-900/20"
                    />
                  </motion.div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <motion.section
          className="w-full py-12 md:py-24 lg:py-32 bg-gray-900"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-gray-800 px-3 py-1 text-sm">How It Works</div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
                  Simple, Transparent, and Secure
                </h2>
                <p className="max-w-[900px] text-gray-400 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  ByteBonds uses Solana blockchain to create a transparent and secure platform for freelancers and
                  investors.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-3 md:gap-12">
              <motion.div
                className="flex flex-col items-center space-y-2 border border-gray-800 rounded-lg p-4 bg-gray-900/50 backdrop-blur-sm"
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-900/20">
                  <svg
                    className="h-8 w-8 text-purple-400"
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 2v20" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">Create Bonds</h3>
                <p className="text-gray-400 text-center">
                  Freelancers create bonds with details about their project, funding needs, and repayment terms.
                </p>
              </motion.div>
              <motion.div
                className="flex flex-col items-center space-y-2 border border-gray-800 rounded-lg p-4 bg-gray-900/50 backdrop-blur-sm"
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-900/20">
                  <svg
                    className="h-8 w-8 text-blue-400"
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                    <path d="M13 5v14" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">Get Funded</h3>
                <p className="text-gray-400 text-center">
                  Investors browse available bonds and fund those that match their investment criteria.
                </p>
              </motion.div>
              <motion.div
                className="flex flex-col items-center space-y-2 border border-gray-800 rounded-lg p-4 bg-gray-900/50 backdrop-blur-sm"
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-900/20">
                  <svg
                    className="h-8 w-8 text-green-400"
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 22V8" />
                    <path d="m19 15-7-7-7 7" />
                    <rect height="4" width="4" x="10" y="2" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">Earn Returns</h3>
                <p className="text-gray-400 text-center">
                  Freelancers make repayments according to the terms, and investors earn interest on their investments.
                </p>
              </motion.div>
            </div>
          </div>
        </motion.section>
      </main>
      <footer className="border-t border-gray-800 py-6">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-center text-sm text-gray-500 md:text-left">
            © {new Date().getFullYear()} ByteBonds. All rights reserved.
          </p>
          <p className="text-center text-sm text-gray-500 md:text-right">
            Program ID: 9Dv2v4Lhcndjv5Mtq3A3m5xZi5JwQkUg3qh9MKT5nqpP
          </p>
        </div>
      </footer>
    </div>
  )
}
