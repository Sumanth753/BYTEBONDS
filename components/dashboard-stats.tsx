"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useWallet } from "@solana/wallet-adapter-react"

export function FreelancerStats() {
  const { connected } = useWallet()

  return (
    <Card>
      <CardHeader>
        <CardTitle>For Freelancers</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-blue-500"></div>
            <span className="text-sm font-medium">Get upfront capital</span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">Up to 10,000 USDC</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium">Flexible repayment terms</span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">3-24 months</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-purple-500"></div>
            <span className="text-sm font-medium">Competitive rates</span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">From 5%</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-yellow-500"></div>
            <span className="text-sm font-medium">Fast funding</span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">As quick as 24 hours</span>
        </div>
        {connected ? (
          <a href="/freelancer">
            <button className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700">
              Go to Freelancer Dashboard
            </button>
          </a>
        ) : (
          <a href="/freelancer">
            <button className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700">
              Get Started
            </button>
          </a>
        )}
      </CardContent>
    </Card>
  )
}

export function InvestorStats() {
  const { connected } = useWallet()

  return (
    <Card>
      <CardHeader>
        <CardTitle>For Investors</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-blue-500"></div>
            <span className="text-sm font-medium">Attractive returns</span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">5-20% APY</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium">Diversify investments</span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">Multiple bonds</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-purple-500"></div>
            <span className="text-sm font-medium">Support talent</span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">Direct impact</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-yellow-500"></div>
            <span className="text-sm font-medium">Transparent terms</span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">Blockchain secured</span>
        </div>

        {connected ? (
          <a href="/investor">
            <button className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700">
              Go to Investor Dashboard
            </button>
          </a>
        ) : (
          <a href="/investor">
            <button className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700">
              Start Investing
            </button>
          </a>
        )}
      </CardContent>
    </Card>
  )
}
