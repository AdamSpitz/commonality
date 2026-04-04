import { useEffect, useState } from 'react'
import { getDirectTrustMapping, getTrustedSet } from '@commonality/sdk'
import { useMachinery } from './useMachinery'

export function useTrustedSet(address?: string) {
  const machinery = useMachinery()
  const [trustedSet, setTrustedSet] = useState<Set<string> | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
  }, [address, machinery])

  return {
    trustedSet,
    isLoading,
    error,
  }
}
