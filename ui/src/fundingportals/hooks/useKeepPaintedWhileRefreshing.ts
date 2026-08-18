import { useRef } from 'react'

/**
 * After the first successful paint of a list/section, keep that UI mounted
 * through background refetches (trust-set refresh, focus, interval).
 *
 * Cause and statement pages share this so a spinner does not replace the
 * project list or leaderboard on every reload.
 */
export function useKeepPaintedWhileRefreshing() {
  const hasResolvedRef = useRef(false)

  return {
    beginLoad(setLoading: (next: boolean) => void) {
      if (!hasResolvedRef.current) setLoading(true)
    },
    markResolved() {
      hasResolvedRef.current = true
    },
  }
}
