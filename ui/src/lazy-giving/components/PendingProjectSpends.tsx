import { useEffect, useState } from 'react'
import { Paper, Stack, Typography } from '@mui/material'
import { decodeEventLog, formatEther, type Address, type Hex } from 'viem'
import { usePublicClient } from 'wagmi'
import { DelegatableNotesAbi } from '@commonality/sdk/abis'
import { fetchEvents } from '@commonality/sdk/utils'
import { useMachinery } from '../../shared'
import { formatPendingSpendDeadline } from '../../delegation/spendClass'

const NOTES = import.meta.env.VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS as string | undefined

/**
 * Scheduled spends are not purchases, so they are absent from the raised total.
 * This lists the ones still pending against this project's assurance contract.
 */
export function PendingProjectSpends({ primaryMarket }: { primaryMarket: string }) {
  const publicClient = usePublicClient()
  const machinery = useMachinery()
  const [lines, setLines] = useState<{ noteId: string; amount: bigint; deadline: bigint }[]>([])

  useEffect(() => {
    if (!publicClient?.readContract || !NOTES || !machinery.eventCacheUrl) {
      setLines([])
      return
    }
    let cancelled = false
    ;(async () => {
      const events = await fetchEvents(machinery, {
        contractAddress: NOTES,
        eventName: 'SpendScheduled',
      })
      const market = primaryMarket.toLowerCase()
      const seen = new Set<string>()
      const next: { noteId: string; amount: bigint; deadline: bigint }[] = []
      for (const event of events) {
        if (!event.topic0 || !event.topic1 || !event.topic2 || !event.topic3) continue
        const decoded = decodeEventLog({
          abi: DelegatableNotesAbi,
          eventName: 'SpendScheduled',
          topics: [event.topic0, event.topic1, event.topic2, event.topic3] as [Hex, Hex, Hex, Hex],
          data: event.data as Hex,
        })
        if (decoded.args.primaryMarket.toLowerCase() !== market) continue
        const noteId = decoded.args.noteId
        const key = noteId.toString()
        if (seen.has(key)) continue
        seen.add(key)
        const pending = await publicClient.readContract({
          address: NOTES as Address,
          abi: DelegatableNotesAbi,
          functionName: 'pendingSpends',
          args: [noteId],
        }) as readonly [Address, Address, bigint, bigint, bigint, bigint, bigint, boolean, boolean]
        if (!pending[8] || pending[0].toLowerCase() !== market) continue
        next.push({ noteId: key, amount: decoded.args.amount, deadline: pending[5] })
      }
      if (!cancelled) setLines(next)
    })().catch(() => {
      if (!cancelled) setLines([])
    })
    return () => { cancelled = true }
  }, [publicClient, machinery, primaryMarket])

  if (lines.length === 0) return null
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Typography variant="subtitle2" gutterBottom>Waiting, and still cancellable</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Not included in the amount raised. The donor or the delegate can still cancel these.
      </Typography>
      <Stack spacing={1}>
        {lines.map((line) => (
          <Typography key={line.noteId} variant="body2">
            {formatEther(line.amount)} ETH. {formatPendingSpendDeadline(line.deadline)}
          </Typography>
        ))}
      </Stack>
    </Paper>
  )
}
