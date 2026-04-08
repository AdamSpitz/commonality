import { useState, useCallback } from 'react'

export interface ClaimChallengeResponse {
  nonce: string
  challengeTweetText: string
}

export interface VerifyConfirmResponse {
  success: boolean
  channelId?: string
  owner?: string
  transactionHash?: string
}

export interface ClaimFlowError {
  message: string
  code?: string
}

export function useClaimFlow() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ClaimFlowError | null>(null)

  const getChallenge = useCallback(async (platform: string, handle: string, claimantAddress: string): Promise<ClaimChallengeResponse | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/platform-api/verify/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, handle, claimantAddress }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.message || 'Failed to get verification challenge')
      }

      return await response.json()
    } catch (err) {
      setError(err instanceof Error ? { message: err.message } : { message: 'Failed to get challenge' })
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const confirmVerification = useCallback(async (nonce: string): Promise<VerifyConfirmResponse | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/platform-api/verify/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nonce }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.message || 'Failed to confirm verification')
      }

      return await response.json()
    } catch (err) {
      setError(err instanceof Error ? { message: err.message } : { message: 'Failed to confirm verification' })
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    getChallenge,
    confirmVerification,
    loading,
    error,
    clearError: () => setError(null),
  }
}