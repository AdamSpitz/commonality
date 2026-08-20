import { useCallback, useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { getUserBeliefs, type StatementListItem } from '@commonality/sdk/conceptspace'
import { useMachinery } from '../lib/useMachinery'

/**
 * Statements the connected wallet has signed (direct belief).
 * Statement bookmarks are not a CauseStarter surface yet.
 */
export function useUserStatements(): {
  statements: StatementListItem[]
  loading: boolean
  connected: boolean
  refresh: () => void
} {
  const machinery = useMachinery()
  const { address } = useAccount()
  const [statements, setStatements] = useState<StatementListItem[]>([])
  const [loading, setLoading] = useState(Boolean(address))
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!address) {
        if (!cancelled) {
          setStatements([])
          setLoading(false)
        }
        return
      }

      if (!cancelled) setLoading(true)
      try {
        const next = await getUserBeliefs(machinery, address)
        if (!cancelled) setStatements(next)
      } catch {
        if (!cancelled) setStatements([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [machinery, address, tick])

  return { statements, loading, connected: Boolean(address), refresh }
}
