import { useEffect, useMemo, useState } from 'react'
import { type Address } from 'viem'
import { readERC20Currency, type Currency } from '@commonality/sdk'

export function usePaymentTokenCurrency(publicClient: unknown, tokenAddress: string | undefined | null): {
  currency: Currency | null
  loading: boolean
} {
  const [currency, setCurrency] = useState<Currency | null>(null)
  const [loading, setLoading] = useState(false)

  const machinery = useMemo(() => ({ publicClient: publicClient as any }), [publicClient])

  useEffect(() => {
    if (!publicClient || !tokenAddress || typeof (publicClient as any).readContract !== 'function') {
      setCurrency(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    readERC20Currency(machinery as any, tokenAddress as Address)
      .then((result) => {
        if (cancelled) return
        setCurrency(result)
      })
      .catch(() => {
        if (!cancelled) setCurrency(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [machinery, publicClient, tokenAddress])

  return { currency, loading }
}
