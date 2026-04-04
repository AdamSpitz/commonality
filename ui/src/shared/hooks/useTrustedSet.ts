import { useCallback, useEffect, useState } from 'react'
import { getDirectTrustMapping, getTrustedSet } from '@commonality/sdk'
import { useMachinery } from './useMachinery'
import {
  SUBJECTIV_TRUST_NETWORK_INVALIDATED_EVENT,
  SUBJECTIV_TRUST_NETWORK_REFRESH_INTERVAL_MS,
} from '../subjectivTrust'

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

      setIsLoading(true)
      setError(null)

      try {
        const directTrust = await getDirectTrustMapping(machinery, address)
        if (cancelled) return

        if (directTrust.size === 0) {
          setTrustedSet(undefined)
          return
        }

        const nextTrustedSet = await getTrustedSet(machinery, address)
        if (!cancelled) {
          setTrustedSet(nextTrustedSet.size > 0 ? nextTrustedSet : undefined)
        }
      } catch (err) {
        if (!cancelled) {
          setTrustedSet(undefined)
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
