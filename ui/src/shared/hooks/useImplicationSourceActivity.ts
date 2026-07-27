import { useEffect, useState } from 'react'
import { getImplicationSourceActivity, type ImplicationSourceActivity } from '@commonality/sdk/conceptspace'
import { useMachinery } from './useMachinery'

/**
 * Why the indirect-supporter count is what it is.
 *
 * `misconfigured` is the case worth shouting about: implication edges exist on
 * this chain, but none of them come from a source the user trusts. That is
 * almost always a default-trust config pointing at another network's attester,
 * and without this distinction it renders as an unremarkable "0".
 */
export type ImplicationSourceStatus =
  | 'loading'
  /** The chain could not be read. We know nothing, so we claim nothing. */
  | 'unknown'
  | 'no-sources-configured'
  | 'misconfigured'
  | 'no-implications-on-chain'
  | 'healthy'

export interface ImplicationSourceDiagnostic {
  status: ImplicationSourceStatus
  activity: ImplicationSourceActivity | null
}

function classify(
  trustedAttesters: string[],
  activity: ImplicationSourceActivity,
): ImplicationSourceStatus {
  if (trustedAttesters.length === 0) return 'no-sources-configured'
  if (activity.totalImplications === 0) return 'no-implications-on-chain'
  if (activity.inactiveTrustedAttesters.length === trustedAttesters.length) return 'misconfigured'
  return 'healthy'
}

/**
 * Diagnose the trusted-implication-source configuration against the chain the
 * UI is actually reading from.
 */
export function useImplicationSourceActivity(trustedAttesters: string[]): ImplicationSourceDiagnostic {
  const machinery = useMachinery()
  const [diagnostic, setDiagnostic] = useState<ImplicationSourceDiagnostic>({
    status: 'loading',
    activity: null,
  })

  const attesterKey = trustedAttesters.join(',')

  useEffect(() => {
    let cancelled = false
    getImplicationSourceActivity(machinery, trustedAttesters)
      .then(activity => {
        if (cancelled) return
        setDiagnostic({ status: classify(trustedAttesters, activity), activity })
      })
      .catch(() => {
        // A diagnostic that cannot read the chain must say nothing at all.
        // Reporting "healthy" here would replace a stale hardcoded claim with a
        // fresh unfounded one, which is the bug this hook exists to prevent.
        if (!cancelled) setDiagnostic({ status: 'unknown', activity: null })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machinery, attesterKey])

  return diagnostic
}
