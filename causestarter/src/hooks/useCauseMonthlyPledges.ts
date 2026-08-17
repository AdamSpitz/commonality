import { useEffect, useMemo, useRef, useState } from 'react'
import { useAccount } from 'wagmi'
import { getStandingPledges } from '@commonality/sdk/delegation'
import { useMachinery } from '../lib/useMachinery'
import { getRuntimeConfig } from '../lib/runtimeConfig'

export interface CauseMonthlyPledges {
  loading: boolean
  available: boolean
  symbol: string
  decimals: number
  connected: boolean
  totalMonthly: bigint
  personalMonthly: bigint
  byPlankCid: Map<string, bigint>
}

export function useCauseMonthlyPledges(statementCids: string[]): CauseMonthlyPledges {
  const machinery = useMachinery()
  const { address } = useAccount()
  const uniqueCids = useMemo(() => [...new Set(statementCids.filter(Boolean))], [statementCids])
  const cidKey = uniqueCids.join('\n')
  const config = getRuntimeConfig()
  const paymentToken = config.VITE_PAYMENT_TOKEN_ADDRESS
  const symbol = config.VITE_PAYMENT_TOKEN_SYMBOL ?? 'tokens'
  const decimals = Number(config.VITE_PAYMENT_TOKEN_DECIMALS ?? '18')
  const available = Boolean(machinery.contractAddresses?.recurringPledges && paymentToken)

  const [loading, setLoading] = useState(false)
  const [totalMonthly, setTotalMonthly] = useState(0n)
  const [personalMonthly, setPersonalMonthly] = useState(0n)
  const [byPlankCid, setByPlankCid] = useState<Map<string, bigint>>(() => new Map())
  const hasResolvedRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    if (!available || uniqueCids.length === 0) {
      setTotalMonthly(0n)
      setPersonalMonthly(0n)
      setByPlankCid(new Map())
      setLoading(false)
      return () => { cancelled = true }
    }

    const cidSet = new Set(uniqueCids)
    const tokenLower = paymentToken!.toLowerCase()
    const ownerLower = address?.toLowerCase()
    if (!hasResolvedRef.current) setLoading(true)
    void getStandingPledges(machinery)
      .then((pledges) => {
        if (cancelled) return
        let total = 0n
        let personal = 0n
        const byPlank = new Map<string, bigint>()
        for (const pledge of pledges) {
          if (!pledge.active) continue
          if (pledge.token.toLowerCase() !== tokenLower) continue
          if (!cidSet.has(pledge.causeRef)) continue
          const amount = BigInt(pledge.amountPerPeriod)
          total += amount
          byPlank.set(pledge.causeRef, (byPlank.get(pledge.causeRef) ?? 0n) + amount)
          if (ownerLower && pledge.rootOwner.toLowerCase() === ownerLower) {
            personal += amount
          }
        }
        setTotalMonthly(total)
        setPersonalMonthly(personal)
        setByPlankCid(byPlank)
      })
      .catch(() => {
        if (cancelled) return
        setTotalMonthly(0n)
        setPersonalMonthly(0n)
        setByPlankCid(new Map())
      })
      .finally(() => {
        if (!cancelled) {
          hasResolvedRef.current = true
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  // cidKey is a stable value dependency for callers that construct arrays while rendering.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machinery, cidKey, paymentToken, available, address])

  return {
    loading,
    available,
    symbol,
    decimals,
    connected: Boolean(address),
    totalMonthly,
    personalMonthly,
    byPlankCid,
  }
}
