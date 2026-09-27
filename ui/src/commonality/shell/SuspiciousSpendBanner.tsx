import { useEffect, useState } from 'react'
import { Alert } from '@mui/material'
import { Link } from 'react-router-dom'
import { useAccount, usePublicClient } from 'wagmi'
import type { Address } from 'viem'
import { DelegatableNotesAbi } from '@commonality/sdk/abis'
import { getNotesByRoot } from '@commonality/sdk/delegation'
import { useMachinery } from '../../shared'
import { isSuspiciousClass } from '../../delegation/spendClass'

const NOTES = import.meta.env.VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS as string | undefined

/** In-app only. Email and push stay unwired; this does not follow a notification opt-in. */
export function SuspiciousSpendBanner() {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const machinery = useMachinery()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!address || !publicClient || !NOTES) {
      setShow(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const notes = await getNotesByRoot(machinery, address)
      for (const note of notes) {
        const contract = { address: (note.contractAddress || NOTES) as Address, abi: DelegatableNotesAbi } as const
        const pending = await publicClient.readContract({
          ...contract,
          functionName: 'pendingSpends',
          args: [BigInt(note.id)],
        }) as readonly [Address, Address, bigint, bigint, bigint, bigint, bigint, boolean, boolean]
        if (!pending[8]) continue
        const classified = await publicClient.readContract({
          ...contract,
          functionName: 'effectiveSpendDelay',
          args: [BigInt(note.id), pending[0]],
        }) as readonly [bigint, number]
        if (isSuspiciousClass(Number(classified[1]))) {
          if (!cancelled) setShow(true)
          return
        }
      }
      if (!cancelled) setShow(false)
    })().catch(() => {
      if (!cancelled) setShow(false)
    })
    return () => { cancelled = true }
  }, [address, publicClient, machinery])

  if (!show) return null
  return (
    <Alert severity="warning" sx={{ mb: 2 }}>
      A delegate spend matched a rule you turned on and is still waiting. <Link to="/delegation/notes#pending-spends">Review it</Link>
    </Alert>
  )
}
