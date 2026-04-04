import { useCallback, useEffect, useState } from 'react'
import { useMachinery } from './useMachinery'
import {
  SUBJECTIV_TRUST_NETWORK_INVALIDATED_EVENT,
  SUBJECTIV_TRUST_NETWORK_REFRESH_INTERVAL_MS,
} from '../subjectivTrust'
import {
  loadCachedSubjectivTrustedSet,
  saveCachedSubjectivTrustedSet,
} from '../subjectivTrustCache'
import { computeSubjectivTrustedSet } from '../subjectivTrustWorkerClient'

interface UseTrustedSetOptions {
  refreshIntervalMs?: number
}

export function useTrustedSet(address?: string, options: UseTrustedSetOptions = {}) {
  const machinery = useMachinery()
  const [trustedSet, setTrustedSet] = useState<Set<string> | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshNonce, setRefreshNonce] = useState(0)
  const refreshIntervalMs = options.refreshIntervalMs ?? SUBJECTIV_TRUST_NETWORK_REFRESH_INTERVAL_MS

  const refreshTrustedSet = useCallback(() => {
    setRefreshNonce(nonce => nonce + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!address || !machinery.eventCacheUrl || !machinery.contractAddresses?.trustRegistry) {
        setTrustedSet(undefined)
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
      }
      let cachedResult = null

      try {
        cachedResult = await loadCachedSubjectivTrustedSet(cacheOptions)
      } catch (cacheError) {
        console.warn('Failed to rehydrate Subjectiv trust network from IndexedDB', cacheError)
      }

      if (cancelled) return

      if (cachedResult) {
        if (!cachedResult.hasDirectTrust) {
          setTrustedSet(undefined)
        } else {
          const cachedTrustedSet = new Set(cachedResult.trustedSet)
          setTrustedSet(cachedTrustedSet.size > 0 ? cachedTrustedSet : undefined)
        }

        if (refreshNonce === 0) {
          setIsLoading(false)
        }
      }

      try {
        const result = await computeSubjectivTrustedSet({
          address,
          eventCacheUrl: machinery.eventCacheUrl,
          contractAddresses: machinery.contractAddresses,
        })

        if (cancelled) return

        if (!result.hasDirectTrust) {
          setTrustedSet(undefined)
        } else if (!cancelled) {
          const nextTrustedSet = new Set(result.trustedSet)
          setTrustedSet(nextTrustedSet.size > 0 ? nextTrustedSet : undefined)
        }

        try {
          await saveCachedSubjectivTrustedSet(cacheOptions, result)
        } catch (cacheError) {
          console.warn('Failed to persist Subjectiv trust network to IndexedDB', cacheError)
        }
      } catch (err) {
        if (!cancelled) {
          if (!cachedResult) {
            setTrustedSet(undefined)
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
  }, [address, machinery, refreshNonce])

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
    isLoading,
    error,
    refreshTrustedSet,
  }
}
