import { useCallback, useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { getUserBeliefs, type StatementListItem } from '@commonality/sdk/conceptspace'
import { useMachinery } from '../../shared'

/**
 * Statements the connected wallet has signed (direct belief).
 * Statement bookmarks are not a CauseStarter surface yet.
 */
export function useUserStatements(): {
  statements: StatementListItem[]
  loading: boolean
  connected: boolean
  error: string | null
  refresh: () => void
} {
  const machinery = useMachinery()
  const { address } = useAccount()
  const [statements, setStatements] = useState<StatementListItem[]>([])
  const [loading, setLoading] = useState(Boolean(address))
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!address) {
        if (!cancelled) {
          setStatements([])
          setError(null)
          setLoading(false)
        }
        return
      }

      if (!cancelled) setLoading(true)
      try {
        const next = await getUserBeliefs(machinery, address)
        if (!cancelled) {
          setStatements(next)
          setError(null)
        }
      } catch (cause) {
        if (!cancelled) {
          setStatements([])
          setError(cause instanceof Error ? cause.message : 'Could not load signed statements')
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

  return { statements, loading, connected: Boolean(address), error, refresh }
}
