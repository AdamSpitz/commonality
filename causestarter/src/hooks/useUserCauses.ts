import { useCallback, useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { listCauses, type CauseDraft } from '../lib/causeStore'
import { listUserCauses } from '../lib/userCauses'
import { useMachinery } from '../lib/useMachinery'

/**
 * Causes for the current browser + connected wallet (localStorage ∪ on-chain support).
 */
export function useUserCauses(): {
  causes: CauseDraft[]
  loading: boolean
  refresh: () => void
} {
  const machinery = useMachinery()
  const { address } = useAccount()
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
        const next = await listUserCauses(machinery, address)
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
  }, [machinery, address, tick])

  return { causes, loading, refresh }
}
