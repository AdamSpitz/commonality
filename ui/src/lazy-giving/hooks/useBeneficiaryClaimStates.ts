import { useEffect, useState } from 'react'
import { fetchAndFoldContentFundingState, type BeneficiaryState } from '@commonality/sdk/content-funding'
import { useMachinery } from '../../shared'

/** One event-cache fold of BeneficiaryRegistry for list views — not per-card RPC. */
export function useBeneficiaryClaimStates(): Map<string, { state: BeneficiaryState }> {
  const machinery = useMachinery()
  const [channels, setChannels] = useState<Map<string, { state: BeneficiaryState }>>(new Map())

  useEffect(() => {
    let cancelled = false
    void fetchAndFoldContentFundingState(machinery)
      .then((result) => {
        if (cancelled || !result) return
        setChannels(result.state.beneficiaryRegistry.channels)
      })
      .catch(() => {
        if (!cancelled) setChannels(new Map())
      })
    return () => {
      cancelled = true
    }
  }, [machinery])

  return channels
}
