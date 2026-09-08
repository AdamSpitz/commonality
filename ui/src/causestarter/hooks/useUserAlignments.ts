import { useCallback, useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { getAlignmentsByAttester, type AlignmentAttestation } from '@commonality/sdk/fundingportals'
import { useMachinery } from '../../shared'

export function useUserAlignments(): {
  attestations: AlignmentAttestation[]
  loading: boolean
  connected: boolean
  error: string | null
  refresh: () => void
} {
  const machinery = useMachinery()
  const { address } = useAccount()
  const [attestations, setAttestations] = useState<AlignmentAttestation[]>([])
  const [loading, setLoading] = useState(Boolean(address))
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!address) {
        if (!cancelled) {
          setAttestations([])
          setError(null)
          setLoading(false)
        }
        return
      }

      if (!cancelled) setLoading(true)
      try {
        const next = await getAlignmentsByAttester(machinery, address)
        if (!cancelled) {
          setAttestations(next)
          setError(null)
        }
      } catch (cause) {
        if (!cancelled) {
          setAttestations([])
          setError(cause instanceof Error ? cause.message : 'Could not load alignment attestations')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [machinery, address, tick])

  return { attestations, loading, connected: Boolean(address), error, refresh }
}
