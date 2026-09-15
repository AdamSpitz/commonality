import { useEffect, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { useTrustedSet } from '@ui/shared'
import { getRuntimeConfigValue } from '../../shared'

/**
 * Personal trust replaces the starter network. The starter root is only in
 * the filter when there is no personal set.
 */
export function resolveTrustedAlignmentAttesters(options: {
  personalAlignmentAttesters?: Set<string>
  starterAlignmentAttesters?: Set<string>
  address?: string
  defaultAlignmentTrustRoot?: string
}): Set<string> | undefined {
  const usingPersonal = options.personalAlignmentAttesters !== undefined
  const base = options.personalAlignmentAttesters ?? options.starterAlignmentAttesters
  if (!base) return base
  const next = new Set([...base].map((entry) => entry.toLowerCase()))
  if (options.address) next.add(options.address.toLowerCase())
  if (!usingPersonal && options.defaultAlignmentTrustRoot) {
    next.add(options.defaultAlignmentTrustRoot.toLowerCase())
  }
  return next
}

export function useAlignmentTrust() {
  const { address } = useAccount()
  const {
    trustedSet: personalAlignmentAttesters,
    isLoading: personalTrustLoading,
    error: personalTrustError,
  } = useTrustedSet(address)
  const defaultAlignmentTrustRoot = getRuntimeConfigValue('VITE_DEFAULT_ALIGNMENT_TRUST_ROOT')
  const {
    trustedSet: defaultAlignmentAttesters,
    isLoading: defaultTrustLoading,
    error: defaultTrustError,
  } = useTrustedSet(defaultAlignmentTrustRoot, { maxHops: 1 })

  /**
   * A configured starter root is itself a vouching network, even before it
   * names other wallets. useTrustedSet returns undefined when the root has no
   * outgoing TrustSet edges; treat that as `{root}` so the cause page does not
   * claim the starter network is missing.
   */
  const starterAlignmentAttesters = useMemo(() => {
    if (defaultAlignmentAttesters && defaultAlignmentAttesters.size > 0) {
      return defaultAlignmentAttesters
    }
    if (defaultAlignmentTrustRoot) {
      return new Set([defaultAlignmentTrustRoot.toLowerCase()])
    }
    return undefined
  }, [defaultAlignmentAttesters, defaultAlignmentTrustRoot])

  const trustedAlignmentAttesters = useMemo(
    () =>
      resolveTrustedAlignmentAttesters({
        personalAlignmentAttesters,
        starterAlignmentAttesters,
        address,
        defaultAlignmentTrustRoot,
      }),
    [personalAlignmentAttesters, starterAlignmentAttesters, address, defaultAlignmentTrustRoot],
  )

  const trustLoading = personalTrustLoading
    || (personalAlignmentAttesters === undefined && defaultTrustLoading)
  const trustError = personalAlignmentAttesters === undefined
    ? (defaultTrustError ?? personalTrustError)
    : personalTrustError

  const addressKey = `${address?.toLowerCase() ?? ''}:${defaultAlignmentTrustRoot?.toLowerCase() ?? ''}`
  const [trustSettled, setTrustSettled] = useState(false)
  useEffect(() => {
    setTrustSettled(false)
  }, [addressKey])
  useEffect(() => {
    if (!trustLoading) setTrustSettled(true)
  }, [trustLoading])

  const alignmentTrustReady = (
    trustSettled && !trustError && trustedAlignmentAttesters !== undefined
  )
  const alignmentTrustUnavailable = trustSettled
    && !trustError
    && trustedAlignmentAttesters === undefined
  const showInitialTrustLoad = !trustSettled && trustLoading

  return {
    trustedAlignmentAttesters,
    alignmentTrustReady,
    alignmentTrustUnavailable,
    showInitialTrustLoad,
    trustError,
  }
}
