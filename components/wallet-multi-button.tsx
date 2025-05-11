"use client"

import type { FC } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton as SolanaWalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { useEffect } from "react"

export const WalletMultiButton: FC = () => {
  const { connected, publicKey, wallet, disconnect } = useWallet()

  // Log wallet information for debugging
  useEffect(() => {
    if (connected && publicKey) {
      console.log("Wallet connected:", {
        publicKey: publicKey.toString(),
        walletName: wallet?.adapter.name,
        walletReadyState: wallet?.adapter.readyState,
      })
    }
  }, [connected, publicKey, wallet])

  return (
    <div className="wallet-adapter-button-wrapper">
      <div className="flex flex-col gap-2">
        <SolanaWalletMultiButton className="wallet-adapter-button" />

        {connected && (
          <div className="flex flex-col gap-1">
            <div className="text-xs text-green-600 dark:text-green-400">
              Connected to Solana Devnet with {wallet?.adapter.name}
            </div>
            <div className="text-xs text-gray-500">
              {publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}
            </div>
          </div>
        )}

        {!connected && (
          <div className="text-xs text-gray-500">Connect with Phantom, Solflare, or other Solana wallets</div>
        )}
      </div>
    </div>
  )
}
