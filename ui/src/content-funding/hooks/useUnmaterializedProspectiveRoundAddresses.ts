import { useEffect, useState } from 'react'
import { getProspectiveRounds } from '@commonality/sdk/content-funding'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import { useMachinery } from '../../shared'

/** Unmaterialized prospective-round addresses, or `undefined` until the fetch succeeds. */
export function useUnmaterializedProspectiveRoundAddresses(): string[] | undefined {
  const machinery = useMachinery()
  const [addresses, setAddresses] = useState<string[] | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    void loadUnmaterializedProspectiveRoundAddresses(machinery)
      .then((next) => {
        if (!cancelled) setAddresses(next)
      })
      .catch(() => {
        // Leave undefined so consumers fail closed (no post-attestation rows).
      })
    return () => {
      cancelled = true
    }
  }, [machinery])

  return addresses
}

const inflight = new WeakMap<SDKMachinery, Promise<string[]>>()

function loadUnmaterializedProspectiveRoundAddresses(machinery: SDKMachinery): Promise<string[]> {
  const existing = inflight.get(machinery)
  if (existing) return existing
  const pending = getProspectiveRounds(machinery).then((rounds) =>
    rounds
      .filter((round) => !round.materializedToken)
      .map((round) => round.round.toLowerCase()),
  )
  inflight.set(machinery, pending)
  void pending
    .catch(() => undefined)
    .finally(() => {
      if (inflight.get(machinery) === pending) inflight.delete(machinery)
    })
  return pending
}
