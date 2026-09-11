import { useEffect, useState } from 'react'
import { fetchAndFoldContentFundingState } from '@commonality/sdk/content-funding'
import { useMachinery } from '../../shared'

/** One event-cache fold of project disavowals for list views — not per-card RPC. */
export function useProjectDisavowals(): Set<string> {
  const machinery = useMachinery()
  const [disavowed, setDisavowed] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    void fetchAndFoldContentFundingState(machinery)
      .then((result) => {
        if (cancelled || !result) return
        setDisavowed(result.state.beneficiaryRegistry.disavowedProjects ?? new Set())
      })
      .catch(() => {
        if (!cancelled) setDisavowed(new Set())
      })
    return () => {
      cancelled = true
    }
  }, [machinery])

  return disavowed
}
