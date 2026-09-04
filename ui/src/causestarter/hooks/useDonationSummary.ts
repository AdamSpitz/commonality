import { useEffect, useState } from 'react'
import { getActiveStandingPledgesByUser, getNotesByRoot } from '@commonality/sdk/delegation'
import { useAccount } from 'wagmi'
import { useMachinery } from '../../shared'

export interface DonationSummary {
  activePledgeCount: number
  activeNoteCount: number
  delegatedNoteCount: number
  loading: boolean
}

const EMPTY_SUMMARY = { activePledgeCount: 0, activeNoteCount: 0, delegatedNoteCount: 0 }

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

    setLoading(true)
    Promise.all([
      getNotesByRoot(machinery, address).catch(() => []),
      machinery.contractAddresses?.recurringPledges
        ? getActiveStandingPledgesByUser(machinery, address).catch(() => [])
        : Promise.resolve([]),
    ]).then(([notes, pledges]) => {
      if (cancelled) return
      const activeNotes = notes.filter((note) => note.active)
      setSummary({
        activePledgeCount: pledges.length,
        activeNoteCount: activeNotes.length,
        delegatedNoteCount: activeNotes.filter((note) => note.owner.toLowerCase() !== note.rootOwner.toLowerCase()).length,
      })
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [address, machinery])

  return { ...summary, loading }
}
