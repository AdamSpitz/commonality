import { useEffect, useState } from 'react'
import { getProspectiveRounds } from '@commonality/sdk/content-funding'
import { useMachinery } from '../../shared'

/** Addresses of prospective rounds that have not materialized. Cause boards
 *  list those only via a project-level alignment vouch, not post attestation. */
export function useUnmaterializedProspectiveRoundAddresses(): string[] {
  const machinery = useMachinery()
  const [addresses, setAddresses] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    void getProspectiveRounds(machinery)
      .then((rounds) => {
        if (cancelled) return
        setAddresses(
          rounds
            .filter((round) => !round.materializedToken)
            .map((round) => round.round.toLowerCase()),
        )
      })
      .catch(() => {
        if (!cancelled) setAddresses([])
      })
    return () => {
      cancelled = true
    }
  }, [machinery])

  return addresses
}
