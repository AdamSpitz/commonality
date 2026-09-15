import { useEffect, useState } from 'react'
import { getActiveStandingPledgesByUser, getNotesByRoot } from '@commonality/sdk/delegation'
import { formatUnits } from 'viem'
import { useAccount } from 'wagmi'
import { getRuntimeConfig, useMachinery } from '../../shared'

export interface DonationSummary {
  activePledgeCount: number
  activeNoteCount: number
  delegatedNoteCount: number
  monthlyPledged: bigint
  monthlyPledgedLabel: string | null
  loading: boolean
}

const EMPTY_SUMMARY = {
  activePledgeCount: 0,
  activeNoteCount: 0,
  delegatedNoteCount: 0,
  monthlyPledged: 0n,
  monthlyPledgedLabel: null as string | null,
}

function formatMonthlyLabel(amount: bigint, decimals: number, symbol: string): string | null {
  if (amount <= 0n) return null
  const raw = formatUnits(amount, decimals)
  const trimmed = raw.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
  return `${trimmed} ${symbol}/month`
}

export function useDonationSummary(): DonationSummary {
  const { address } = useAccount()
  const machinery = useMachinery()
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(Boolean(address))

  useEffect(() => {
    let cancelled = false
    if (!address) {
      setSummary(EMPTY_SUMMARY)
      setLoading(false)
      return () => { cancelled = true }
    }

    const config = getRuntimeConfig()
    const paymentToken = config.VITE_PAYMENT_TOKEN_ADDRESS?.toLowerCase()
    const symbol = config.VITE_PAYMENT_TOKEN_SYMBOL ?? 'tokens'
    const decimals = Number(config.VITE_PAYMENT_TOKEN_DECIMALS ?? '18')

    setLoading(true)
    Promise.all([
      getNotesByRoot(machinery, address).catch(() => []),
      machinery.contractAddresses?.recurringPledges
        ? getActiveStandingPledgesByUser(machinery, address).catch(() => [])
        : Promise.resolve([]),
    ]).then(([notes, pledges]) => {
      if (cancelled) return
      const activeNotes = notes.filter((note) => note.active)
      const monthlyPledged = pledges.reduce((sum, pledge) => {
        if (paymentToken && pledge.token.toLowerCase() !== paymentToken) return sum
        return sum + BigInt(pledge.amountPerPeriod)
      }, 0n)
      setSummary({
        activePledgeCount: pledges.length,
        activeNoteCount: activeNotes.length,
        delegatedNoteCount: activeNotes.filter((note) => note.owner.toLowerCase() !== note.rootOwner.toLowerCase()).length,
        monthlyPledged,
        monthlyPledgedLabel: formatMonthlyLabel(monthlyPledged, decimals, symbol),
      })
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [address, machinery])

  return { ...summary, loading }
}
