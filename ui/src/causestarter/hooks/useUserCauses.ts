import { useCallback, useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { listCauses, unbookmarkCause, type CauseDraft } from '../lib/causeStore'
import {
  persistCauseBookmarks, rememberBookmarkRemoved, syncCauseBookmarks,
} from '../lib/causeBookmarks'
import { useMachinery, useWriteClients } from '../../shared'

/**
 * Drafts and published keeps on this device, plus published keeps from the
 * connected wallet's `bookmarked-causes` ref.
 */
export function useUserCauses(): {
  causes: CauseDraft[]
  loading: boolean
  refresh: () => void
  removeBookmark: (cause: CauseDraft) => void
} {
  const machinery = useMachinery()
  const { address } = useAccount()
  const writeClients = useWriteClients(address)
  const writeReady = Boolean(writeClients)
  const [causes, setCauses] = useState<CauseDraft[]>(() => listCauses())
  const [loading, setLoading] = useState(Boolean(address))
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((n) => n + 1), [])

  const removeBookmark = useCallback((cause: CauseDraft) => {
    if (cause.founderAddress && cause.slug) {
      rememberBookmarkRemoved({ owner: cause.founderAddress, slug: cause.slug })
    }
    unbookmarkCause(cause)
    setCauses((current) => current.filter((row) => row.id !== cause.id))
    if (address && writeClients) {
      void persistCauseBookmarks(machinery, address, writeClients).catch((error) => {
        console.warn('Could not update wallet cause bookmarks', error)
      })
    }
  }, [address, machinery, writeClients])

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

  return { causes, loading, refresh, removeBookmark }
}
