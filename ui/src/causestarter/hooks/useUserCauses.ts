import { useCallback, useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { listCauses, type CauseDraft } from '../lib/causeStore'
import { syncCauseBookmarks } from '../lib/causeBookmarks'
import { useMachinery } from '../lib/useMachinery'
import { useWriteClients } from '../lib/useWriteClients'

/**
 * Drafts and published keeps on this device, plus published keeps from the
 * connected wallet's `bookmarked-causes` ref.
 */
export function useUserCauses(): {
  causes: CauseDraft[]
  loading: boolean
  refresh: () => void
} {
  const machinery = useMachinery()
  const { address } = useAccount()
  const writeClients = useWriteClients(address)
  const writeReady = Boolean(writeClients)
  const [causes, setCauses] = useState<CauseDraft[]>(() => listCauses())
  const [loading, setLoading] = useState(Boolean(address))
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!address) {
        if (!cancelled) {
          setCauses(listCauses())
          setLoading(false)
        }
        return
      }

      if (!cancelled) setLoading(true)
      try {
        const next = await syncCauseBookmarks(machinery, address, writeClients)
        if (!cancelled) setCauses(next)
      } catch {
        if (!cancelled) setCauses(listCauses())
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
    // writeReady flips once the wallet client is available; do not depend on the
    // clients object identity (it is recreated every render).
  }, [machinery, address, writeReady, tick])

  return { causes, loading, refresh }
}
