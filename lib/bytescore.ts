import { type Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { getConnection } from "./program"

// ByteScore calculation parameters
const WALLET_AGE_WEIGHT = 0.15
const TX_FREQUENCY_WEIGHT = 0.2
const VOLUME_WEIGHT = 0.2
const DIVERSITY_WEIGHT = 0.1
const CONTRACT_USAGE_WEIGHT = 0.1
const BYTEBONDS_REPAYMENT_WEIGHT = 0.2

// Maximum values for normalization
const MAX_WALLET_AGE_DAYS = 365 // 1 year
const MAX_TX_COUNT = 1000
const MAX_VOLUME_SOL = 1000
const MAX_TOKEN_TYPES = 10
const MAX_CONTRACT_INTERACTIONS = 100
const MAX_REPAYMENT_RATIO = 1.0 // 100% repayment

// Red flag thresholds
const FAILED_TX_THRESHOLD = 0.3 // 30% failed transactions
const INACTIVE_DAYS_THRESHOLD = 30 // 30 days of inactivity

export interface ByteScoreData {
  score: number
  breakdown: {
    walletAge: number
    transactionFrequency: number
    volume: number
    diversity: number
    contractUsage: number
    repaymentHistory: number
    redFlags: number
  }
  metrics: {
    walletAgeDays: number
    transactionCount: number
    volumeSOL: number
    uniqueTokens: number
    contractInteractions: number
    repaymentRatio: number
    failedTransactionRatio: number
    inactiveDays: number
  }
}

/**
 * Calculate ByteScore for a wallet address
 * @param walletAddress Solana wallet address
 * @returns ByteScore data including overall score and breakdown
 */
export async function calculateByteScore(walletAddress: string): Promise<ByteScoreData> {
  try {
    // Validate wallet address format
    let publicKey: PublicKey
    try {
      publicKey = new PublicKey(walletAddress)
      // Verify it's a valid public key
      if (!PublicKey.isOnCurve(publicKey)) {
        console.warn("Wallet address is not on curve:", walletAddress)
        return getDefaultByteScore()
      }
    } catch (error) {
      console.error("Invalid wallet address format:", error)
      return getDefaultByteScore()
    }

    const connection = getConnection()

    // Fetch wallet data with proper error handling for each component
    const [walletAgeDays, transactionData, tokenAccounts, programInteractions, repaymentData, redFlagData] =
      await Promise.all([
        getWalletAge(connection, publicKey).catch((err) => {
          console.error("Error getting wallet age:", err)
          return 0
        }),
        getTransactionData(connection, publicKey).catch((err) => {
          console.error("Error getting transaction data:", err)
          return { count: 0, volumeSOL: 0 }
        }),
        getTokenDiversity(connection, publicKey).catch((err) => {
          console.error("Error getting token diversity:", err)
          return { uniqueTokens: 0 }
        }),
        getContractUsage(connection, publicKey).catch((err) => {
          console.error("Error getting contract usage:", err)
          return { count: 0 }
        }),
        getBytebondsRepaymentData(walletAddress).catch((err) => {
          console.error("Error getting ByteBonds repayment data:", err)
          return { repaymentRatio: 0.5 }
        }),
        getRedFlagData(connection, publicKey).catch((err) => {
          console.error("Error getting red flag data:", err)
          return { failedTransactionRatio: 0, inactiveDays: 0 }
        }),
      ])

    // Calculate individual scores
    const walletAgeScore = Math.min(walletAgeDays / MAX_WALLET_AGE_DAYS, 1) * 100
    const txFrequencyScore = Math.min(transactionData.count / MAX_TX_COUNT, 1) * 100
    const volumeScore = Math.min(transactionData.volumeSOL / MAX_VOLUME_SOL, 1) * 100
    const diversityScore = Math.min(tokenAccounts.uniqueTokens / MAX_TOKEN_TYPES, 1) * 100
    const contractUsageScore = Math.min(programInteractions.count / MAX_CONTRACT_INTERACTIONS, 1) * 100
    const bytebondsRepaymentScore = Math.min(repaymentData.repaymentRatio / MAX_REPAYMENT_RATIO, 1) * 100

    // Calculate red flag penalty (0-20 points)
    const redFlagScore = calculateRedFlagPenalty(redFlagData, transactionData)

    // Calculate total score
    let totalScore =
      walletAgeScore * WALLET_AGE_WEIGHT +
      txFrequencyScore * TX_FREQUENCY_WEIGHT +
      volumeScore * VOLUME_WEIGHT +
      diversityScore * DIVERSITY_WEIGHT +
      contractUsageScore * CONTRACT_USAGE_WEIGHT +
      bytebondsRepaymentScore * BYTEBONDS_REPAYMENT_WEIGHT -
      redFlagScore

    // Ensure score is between 0 and 100
    totalScore = Math.max(0, Math.min(100, totalScore))

    return {
      score: Math.round(totalScore),
      breakdown: {
        walletAge: Math.round(walletAgeScore * WALLET_AGE_WEIGHT),
        transactionFrequency: Math.round(txFrequencyScore * TX_FREQUENCY_WEIGHT),
        volume: Math.round(volumeScore * VOLUME_WEIGHT),
        diversity: Math.round(diversityScore * DIVERSITY_WEIGHT),
        contractUsage: Math.round(contractUsageScore * CONTRACT_USAGE_WEIGHT),
        repaymentHistory: Math.round(bytebondsRepaymentScore * BYTEBONDS_REPAYMENT_WEIGHT),
        redFlags: Math.round(redFlagScore),
      },
      metrics: {
        walletAgeDays,
        transactionCount: transactionData.count,
        volumeSOL: transactionData.volumeSOL,
        uniqueTokens: tokenAccounts.uniqueTokens,
        contractInteractions: programInteractions.count,
        repaymentRatio: repaymentData.repaymentRatio,
        failedTransactionRatio: redFlagData.failedTransactionRatio,
        inactiveDays: redFlagData.inactiveDays,
      },
    }
  } catch (error) {
    console.error("Error calculating ByteScore:", error)
    return getDefaultByteScore()
  }
}

/**
 * Get wallet age in days
 */
async function getWalletAge(connection: Connection, publicKey: PublicKey): Promise<number> {
  try {
    // Validate the public key before proceeding
    if (!publicKey || !PublicKey.isOnCurve(publicKey)) {
      throw new Error("Invalid public key")
    }

    // Get the oldest transaction for this wallet
    const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 1 }, "confirmed").catch((err) => {
      console.warn(`Error fetching signatures: ${err.message}`)
      return []
    })

    if (signatures.length === 0) {
      return 0
    }

    const oldestTx = signatures[signatures.length - 1]
    if (!oldestTx.blockTime) {
      return 0
    }

    const walletCreationTime = oldestTx.blockTime * 1000 // Convert to milliseconds
    const currentTime = Date.now()
    const walletAgeDays = (currentTime - walletCreationTime) / (1000 * 60 * 60 * 24)

    return Math.max(0, Math.round(walletAgeDays))
  } catch (error) {
    console.error("Error getting wallet age:", error)
    return 0
  }
}

/**
 * Get transaction frequency and volume data
 */
async function getTransactionData(
  connection: Connection,
  publicKey: PublicKey,
): Promise<{ count: number; volumeSOL: number }> {
  try {
    // Validate the public key before proceeding
    if (!publicKey || !PublicKey.isOnCurve(publicKey)) {
      throw new Error("Invalid public key")
    }

    // Get recent transactions (last 30 days)
    const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)

    // Use a try-catch block specifically for the getSignaturesForAddress call
    let signatures = []
    try {
      signatures = await connection.getSignaturesForAddress(publicKey, { limit: 100 }, "confirmed")
    } catch (err) {
      console.warn(`Error fetching signatures: ${err.message}`)
      return { count: 0, volumeSOL: 0 }
    }

    let volumeSOL = 0

    // Calculate transaction volume (limit to 10 transactions for performance)
    const txsToProcess = signatures.slice(0, 10)

    // Process transactions in parallel with individual error handling
    const txPromises = txsToProcess.map(async (sig) => {
      if (!sig.signature) return 0

      try {
        const tx = await connection.getTransaction(sig.signature, { maxSupportedTransactionVersion: 0 })
        if (tx && tx.meta) {
          // Find index of the wallet in the accounts
          const accountIndex = tx.transaction.message.accountKeys.findIndex(
            (key) => key.toString() === publicKey.toString(),
          )

          if (accountIndex >= 0 && tx.meta.preBalances && tx.meta.postBalances) {
            const balanceDiff = Math.abs(tx.meta.preBalances[accountIndex] - tx.meta.postBalances[accountIndex])
            return balanceDiff / LAMPORTS_PER_SOL
          }
        }
      } catch (error) {
        console.warn(`Error processing transaction ${sig.signature}:`, error)
      }
      return 0
    })

    // Sum up all transaction volumes
    const volumes = await Promise.all(txPromises)
    volumeSOL = volumes.reduce((sum, vol) => sum + vol, 0)

    return {
      count: signatures.length,
      volumeSOL,
    }
  } catch (error) {
    console.error("Error getting transaction data:", error)
    return { count: 0, volumeSOL: 0 }
  }
}

/**
 * Get token diversity data
 */
async function getTokenDiversity(connection: Connection, publicKey: PublicKey): Promise<{ uniqueTokens: number }> {
  try {
    // This is a simplified version - in production, you'd use the Token Program to get actual token accounts
    // For devnet demo purposes, we'll use a random number between 1-5
    const uniqueTokens = Math.floor(Math.random() * 5) + 1

    return { uniqueTokens }
  } catch (error) {
    console.error("Error getting token diversity:", error)
    return { uniqueTokens: 0 }
  }
}

/**
 * Get contract/program usage data
 */
async function getContractUsage(connection: Connection, publicKey: PublicKey): Promise<{ count: number }> {
  try {
    // Validate the public key before proceeding
    if (!publicKey || !PublicKey.isOnCurve(publicKey)) {
      throw new Error("Invalid public key")
    }

    // Get recent transactions
    let signatures = []
    try {
      signatures = await connection.getSignaturesForAddress(publicKey, { limit: 20 }, "confirmed")
    } catch (err) {
      console.warn(`Error fetching signatures: ${err.message}`)
      return { count: 0 }
    }

    // Set to track unique program IDs
    const uniqueProgramIds = new Set<string>()

    // Process transactions to find program interactions (limit to 5 for performance)
    const txsToProcess = signatures.slice(0, 5)

    for (const sig of txsToProcess) {
      if (!sig.signature) continue

      try {
        const tx = await connection.getTransaction(sig.signature, { maxSupportedTransactionVersion: 0 })
        if (tx && tx.transaction.message.instructions) {
          // Add program IDs to the set
          tx.transaction.message.instructions.forEach((instruction) => {
            const programId = tx.transaction.message.accountKeys[instruction.programIdIndex].toString()
            uniqueProgramIds.add(programId)
          })
        }
      } catch (error) {
        console.warn(`Error processing transaction ${sig.signature}:`, error)
      }
    }

    // Remove system program from count
    uniqueProgramIds.delete("11111111111111111111111111111111")

    return { count: uniqueProgramIds.size }
  } catch (error) {
    console.error("Error getting contract usage:", error)
    return { count: 0 }
  }
}

/**
 * Get ByteBonds repayment data
 */
async function getBytebondsRepaymentData(walletAddress: string): Promise<{ repaymentRatio: number }> {
  try {
    // In a real implementation, you would fetch this data from your ByteBonds contract
    // For now, we'll use a random value between 0.5 and 1.0 for demo purposes
    // In production, this would be calculated from actual repayment history

    // For wallets that have created bonds, calculate actual repayment ratio
    // This would be: (total amount repaid) / (total amount due including interest)

    // For new wallets with no history, assign a neutral score
    const repaymentRatio = 0.75 + Math.random() * 0.25

    return { repaymentRatio }
  } catch (error) {
    console.error("Error getting ByteBonds repayment data:", error)
    return { repaymentRatio: 0.5 } // Neutral score for error cases
  }
}

/**
 * Get red flag data
 */
async function getRedFlagData(
  connection: Connection,
  publicKey: PublicKey,
): Promise<{
  failedTransactionRatio: number
  inactiveDays: number
}> {
  try {
    // Validate the public key before proceeding
    if (!publicKey || !PublicKey.isOnCurve(publicKey)) {
      throw new Error("Invalid public key")
    }

    // Get recent transactions
    let signatures = []
    try {
      signatures = await connection.getSignaturesForAddress(publicKey, { limit: 20 }, "confirmed")
    } catch (err) {
      console.warn(`Error fetching signatures: ${err.message}`)
      return {
        failedTransactionRatio: 0,
        inactiveDays: MAX_WALLET_AGE_DAYS / 2, // Moderate penalty for new/invalid wallets
      }
    }

    // Calculate failed transaction ratio
    const failedTxCount = signatures.filter((sig) => sig.err !== null).length
    const failedTransactionRatio = signatures.length > 0 ? failedTxCount / signatures.length : 0

    // Calculate days since last activity
    let inactiveDays = 0
    if (signatures.length > 0 && signatures[0].blockTime) {
      const lastActivityTime = signatures[0].blockTime * 1000 // Convert to milliseconds
      inactiveDays = Math.round((Date.now() - lastActivityTime) / (1000 * 60 * 60 * 24))
    } else {
      inactiveDays = MAX_WALLET_AGE_DAYS / 2 // Moderate penalty if no activity
    }

    return {
      failedTransactionRatio,
      inactiveDays,
    }
  } catch (error) {
    console.error("Error getting red flag data:", error)
    return {
      failedTransactionRatio: 0,
      inactiveDays: 0,
    }
  }
}

/**
 * Calculate red flag penalty
 */
function calculateRedFlagPenalty(
  redFlagData: { failedTransactionRatio: number; inactiveDays: number },
  transactionData: { count: number; volumeSOL: number },
): number {
  let penalty = 0

  // Penalty for high failed transaction ratio
  if (redFlagData.failedTransactionRatio > FAILED_TX_THRESHOLD) {
    penalty += (10 * (redFlagData.failedTransactionRatio - FAILED_TX_THRESHOLD)) / (1 - FAILED_TX_THRESHOLD)
  }

  // Penalty for inactivity
  if (redFlagData.inactiveDays > INACTIVE_DAYS_THRESHOLD) {
    penalty += 10 * Math.min(redFlagData.inactiveDays / 90, 1) // Max 10 points for 90+ days inactive
  }

  // Penalty for very low transaction count (new or inactive wallets)
  if (transactionData.count < 5) {
    penalty += 5 * (1 - transactionData.count / 5)
  }

  return Math.min(20, penalty) // Cap at 20 points
}

/**
 * Get default ByteScore for new wallets or error cases
 */
function getDefaultByteScore(): ByteScoreData {
  return {
    score: 50, // Neutral score for new wallets
    breakdown: {
      walletAge: 0,
      transactionFrequency: 10,
      volume: 10,
      diversity: 5,
      contractUsage: 5,
      repaymentHistory: 10,
      redFlags: 0,
    },
    metrics: {
      walletAgeDays: 0,
      transactionCount: 0,
      volumeSOL: 0,
      uniqueTokens: 0,
      contractInteractions: 0,
      repaymentRatio: 0.5,
      failedTransactionRatio: 0,
      inactiveDays: 0,
    },
  }
}
