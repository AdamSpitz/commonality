import { useCallback, useEffect, useState } from 'react'
import { useMachinery } from './useMachinery'
import {
  SUBJECTIV_TRUST_NETWORK_INVALIDATED_EVENT,
  SUBJECTIV_TRUST_NETWORK_REFRESH_INTERVAL_MS,
  type SubjectivTrustWeights,
} from '../subjectivTrust'
import {
  loadCachedSubjectivTrustedSet,
  saveCachedSubjectivTrustedSet,
} from '../subjectivTrustCache'
import { computeSubjectivTrustedSet } from '../subjectivTrustWorkerClient'

interface UseTrustedSetOptions {
  refreshIntervalMs?: number
  /** Maximum trust-graph hops to traverse (default: full transitive network). */
  maxHops?: number
}

/** Deserialize the worker/cache trust-weight record into a lowercased address->score map. */
function toWeightMap(record?: SubjectivTrustWeights): Map<string, number> | undefined {
  if (!record) return undefined
  const map = new Map<string, number>()
  for (const [address, score] of Object.entries(record)) {
    if (Number.isFinite(score) && score > 0) map.set(address.toLowerCase(), score)
  }
  return map.size > 0 ? map : undefined
}

export function useTrustedSet(address?: string, options: UseTrustedSetOptions = {}) {
  const machinery = useMachinery()
  const { refreshIntervalMs = SUBJECTIV_TRUST_NETWORK_REFRESH_INTERVAL_MS, maxHops } = options
  const [trustedSet, setTrustedSet] = useState<Set<string> | undefined>(undefined)
  const [trustWeights, setTrustWeights] = useState<Map<string, number> | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshNonce, setRefreshNonce] = useState(0)

  const refreshTrustedSet = useCallback(() => {
    setRefreshNonce(nonce => nonce + 1)
  }, [])

  /** Apply a computation result/progress to both the trusted set and the weight map. */
  const applyTrustResult = useCallback(
    (result: { hasDirectTrust: boolean; trustedSet: string[]; trustWeights?: SubjectivTrustWeights }) => {
      if (!result.hasDirectTrust) {
        setTrustedSet(undefined)
        setTrustWeights(undefined)
        return
      }
      const nextSet = new Set(result.trustedSet)
      setTrustedSet(nextSet.size > 0 ? nextSet : undefined)
      setTrustWeights(toWeightMap(result.trustWeights))
    },
    [],
  )

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!address || !machinery.eventCacheUrl || !machinery.contractAddresses?.trustRegistry) {
        setTrustedSet(undefined)
        setTrustWeights(undefined)
        setError(null)
        setIsLoading(false)
        return
      }

      setError(null)
      setIsLoading(true)

      const cacheOptions = {
        address,
        eventCacheUrl: machinery.eventCacheUrl,
        contractAddresses: {
          trustRegistry: machinery.contractAddresses.trustRegistry,
        },
        maxHops,
      }
      let cachedResult = null

      try {
        cachedResult = await loadCachedSubjectivTrustedSet(cacheOptions)
      } catch (cacheError) {
        console.warn('Failed to rehydrate Subjectiv trust network from IndexedDB', cacheError)
      }

      if (cancelled) return

      if (cachedResult) {
        applyTrustResult(cachedResult)

        if (refreshNonce === 0) {
          setIsLoading(false)
        }
      }

      try {
        const result = await computeSubjectivTrustedSet({
          address,
          eventCacheUrl: machinery.eventCacheUrl,
          contractAddresses: machinery.contractAddresses,
          cachedDirectTrustMappings: cachedResult?.directTrustMappings,
          maxHops,
          onProgress: progress => {
            if (cancelled) {
              return
            }

            applyTrustResult(progress)
          },
        })

        if (cancelled) return

        applyTrustResult(result)

        try {
          await saveCachedSubjectivTrustedSet(cacheOptions, result)
        } catch (cacheError) {
          console.warn('Failed to persist Subjectiv trust network to IndexedDB', cacheError)
        }
      } catch (err) {
        if (!cancelled) {
          if (!cachedResult) {
            setTrustedSet(undefined)
            setTrustWeights(undefined)
          }
          setError(err instanceof Error ? err.message : 'Failed to build trust network')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [address, machinery, refreshNonce, applyTrustResult, maxHops])

  useEffect(() => {
    if (!address || !machinery.eventCacheUrl || !machinery.contractAddresses?.trustRegistry) {
      return
    }

    const handleWindowFocus = () => {
      refreshTrustedSet()
    }

    window.addEventListener(SUBJECTIV_TRUST_NETWORK_INVALIDATED_EVENT, refreshTrustedSet)
    window.addEventListener('focus', handleWindowFocus)

    const intervalId = window.setInterval(() => {
      refreshTrustedSet()
    }, refreshIntervalMs)

    return () => {
      window.removeEventListener(SUBJECTIV_TRUST_NETWORK_INVALIDATED_EVENT, refreshTrustedSet)
      window.removeEventListener('focus', handleWindowFocus)
      window.clearInterval(intervalId)
    }
  }, [address, machinery, refreshIntervalMs, refreshTrustedSet])

  return {
    trustedSet,
    trustWeights,
    isLoading,
    error,
    refreshTrustedSet,
  }
}
