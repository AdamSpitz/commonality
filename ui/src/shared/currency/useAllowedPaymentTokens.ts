import { useEffect, useState } from 'react'
import { getRuntimeConfig } from '../config/runtimeConfig'

const registryAbi = [
  { type: 'function', name: 'tokenCount', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'tokenAt', stateMutability: 'view', inputs: [{ type: 'uint256', name: 'index' }], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'isAllowed', stateMutability: 'view', inputs: [{ type: 'address', name: 'token' }], outputs: [{ type: 'bool' }] },
] as const

export interface AllowedPaymentToken {
  address: `0x${string}`
}

/**
 * Allowed settlement tokens from PaymentTokenRegistry. Falls back to the
 * configured default token when the registry is unset, so a one-token
 * deployment still has a selection.
 */
export function useAllowedPaymentTokens(publicClient: unknown): {
  tokens: AllowedPaymentToken[]
  loading: boolean
} {
  const [tokens, setTokens] = useState<AllowedPaymentToken[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const registry = getRuntimeConfig().VITE_PAYMENT_TOKEN_REGISTRY_ADDRESS
    const fallback = getRuntimeConfig().VITE_PAYMENT_TOKEN_ADDRESS
    const client = publicClient as { readContract?: (args: unknown) => Promise<unknown> } | null
    const read = client?.readContract?.bind(client)
    if (!read || !registry) {
      setTokens(fallback ? [{ address: fallback as `0x${string}` }] : [])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const count = await read({
          address: registry as `0x${string}`,
          abi: registryAbi,
          functionName: 'tokenCount',
        }) as bigint
        const listed: AllowedPaymentToken[] = []
        for (let i = 0n; i < count; i++) {
          const address = await read({
            address: registry as `0x${string}`,
            abi: registryAbi,
            functionName: 'tokenAt',
            args: [i],
          }) as `0x${string}`
          const allowed = await read({
            address: registry as `0x${string}`,
            abi: registryAbi,
            functionName: 'isAllowed',
            args: [address],
          }) as boolean
          if (allowed && !listed.some((token) => token.address.toLowerCase() === address.toLowerCase())) listed.push({ address })
        }
        if (!cancelled) setTokens(listed)
      } catch {
        if (!cancelled) setTokens(fallback ? [{ address: fallback as `0x${string}` }] : [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [publicClient])

  return { tokens, loading }
}
