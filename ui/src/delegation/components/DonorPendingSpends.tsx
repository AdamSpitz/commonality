import { useEffect, useState } from 'react'
import { Chip, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { usePublicClient } from 'wagmi'
import type { Address } from 'viem'
import { DelegatableNotesAbi } from '@commonality/sdk/abis'
import type { Note } from '@commonality/sdk/delegation'
import { formatPendingSpendDeadline, isSuspiciousClass, spendClassLabel } from '../spendClass'
import { formatNoteAmount, noteDetailPathFor } from '../utils'

type Row = {
  note: Note
  deadline: bigint
  paused: boolean
  spendClass: number
}

export function DonorPendingSpends({ notes }: { notes: Note[] }) {
  const publicClient = usePublicClient()
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    if (!publicClient || notes.length === 0) {
      setRows([])
      return
    }
    let cancelled = false
    ;(async () => {
      const found: Row[] = []
      for (const note of notes) {
        const contract = { address: note.contractAddress as Address, abi: DelegatableNotesAbi } as const
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
        const deadline = await publicClient.readContract({
          ...contract,
          functionName: 'effectivePendingSpendDeadline',
          args: [BigInt(note.id)],
        })
        found.push({
          note,
          deadline,
          paused: pending[7],
          spendClass: Number(classified[1]),
        })
      }
      if (!cancelled) setRows(found)
    })().catch(() => {
      if (!cancelled) setRows([])
    })
    return () => { cancelled = true }
  }, [publicClient, notes])

  if (rows.length === 0) return null

  return (
    <Stack spacing={2} sx={{ mb: 3 }} id="pending-spends">
      <Typography variant="h5" component="h2">Pending delegate spends</Typography>
      <Typography variant="body2" color="text.secondary">
        These amounts can still be cancelled. They are not counted as raised.
      </Typography>
      {rows.map((row) => {
        const label = spendClassLabel(row.spendClass)
        const suspicious = isSuspiciousClass(row.spendClass)
        return (
          <Paper
            key={`${row.note.contractAddress}:${row.note.id}`}
            variant="outlined"
            sx={{ p: 2, borderColor: suspicious ? 'warning.main' : 'divider' }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography
                component={RouterLink}
                to={noteDetailPathFor(row.note.contractAddress, row.note.id)}
                sx={{ fontWeight: 700 }}
              >
                {formatNoteAmount(row.note)}
              </Typography>
              <Chip label={label} size="small" color={suspicious ? 'warning' : label === 'Unsuspicious' ? 'success' : 'default'} />
              {row.paused && <Chip label="Paused" size="small" color="warning" />}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {formatPendingSpendDeadline(row.deadline)}
            </Typography>
          </Paper>
        )
      })}
    </Stack>
  )
}
