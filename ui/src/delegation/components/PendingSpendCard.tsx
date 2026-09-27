import { useEffect, useState } from 'react'
import { Alert, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import { usePublicClient } from 'wagmi'
import type { Address } from 'viem'
import type { Currency } from '@commonality/sdk/utils'
import { formatCurrencyAmount } from '../../shared/funding'
import { DelegatableNotesAbi } from '@commonality/sdk/abis'
import { approveScheduledSpend, cancelScheduledSpend } from '@commonality/sdk/delegation'
import { useWriteClients } from '../../shared'
import { formatPendingSpendDeadline, isSuspiciousClass, spendClassLabel } from '../spendClass'

type PendingRow = {
  primaryMarket: Address
  deadline: bigint
  paused: boolean
  amount: bigint
  spendClass: number
}

export function PendingSpendCard({
  noteId,
  contractAddress,
  owners,
  amount,
  currency,
  canApprove,
  canCancel,
  onChanged,
}: {
  noteId: bigint
  contractAddress: Address
  owners: Address[]
  amount: bigint
  currency: Currency
  canApprove: boolean
  canCancel: boolean
  onChanged?: () => Promise<void>
}) {
  const publicClient = usePublicClient()
  const clients = useWriteClients()
  const [row, setRow] = useState<PendingRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!publicClient) return
    let cancelled = false
    const contract = { address: contractAddress, abi: DelegatableNotesAbi } as const
    ;(async () => {
      const pending = await publicClient.readContract({
        ...contract,
        functionName: 'pendingSpends',
        args: [noteId],
      }) as readonly [Address, Address, bigint, bigint, bigint, bigint, bigint, boolean, boolean]
      if (!pending[8]) {
        if (!cancelled) setRow(null)
        return
      }
      const classified = await publicClient.readContract({
        ...contract,
        functionName: 'effectiveSpendDelay',
        args: [noteId, pending[0]],
      }) as readonly [bigint, number]
      const deadline = await publicClient.readContract({
        ...contract,
        functionName: 'effectivePendingSpendDeadline',
        args: [noteId],
      })
      if (!cancelled) {
        setRow({
          primaryMarket: pending[0],
          deadline,
          paused: pending[7],
          amount,
          spendClass: Number(classified[1]),
        })
      }
    })().catch(() => {
      if (!cancelled) setRow(null)
    })
    return () => { cancelled = true }
  }, [publicClient, contractAddress, noteId, amount, busy])

  if (!row) return null
  const label = spendClassLabel(row.spendClass)
  const suspicious = isSuspiciousClass(row.spendClass)

  async function act(kind: 'approve' | 'cancel') {
    if (!clients) return
    setBusy(true)
    setError(null)
    try {
      const contract = { address: contractAddress, abi: DelegatableNotesAbi }
      const params = { noteId, owners }
      const hash = kind === 'approve'
        ? await approveScheduledSpend(clients, contract, params)
        : await cancelScheduledSpend(clients, contract, params)
      const receipt = await clients.publicClient.waitForTransactionReceipt({ hash })
      if (receipt.status !== 'success') throw new Error('The pending spend update reverted')
      await onChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the pending spend')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Paper sx={{ p: 2, mb: 3, borderColor: suspicious ? 'warning.main' : 'divider', borderWidth: 1, borderStyle: 'solid' }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle2">Pending spend</Typography>
        <Chip label={label} size="small" color={suspicious ? 'warning' : label === 'Unsuspicious' ? 'success' : 'default'} />
        {row.paused && <Chip label="Paused" size="small" color="warning" />}
      </Stack>
      <Typography variant="body1">{formatCurrencyAmount(row.amount, currency)}</Typography>
      <Typography variant="body2" color="text.secondary">
        {row.paused
          ? 'Paused. The delegate cannot cancel it. You can approve it or cancel it. It is not counted as raised.'
          : formatPendingSpendDeadline(row.deadline)}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
        Project {row.primaryMarket}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        {canApprove && <Button size="small" variant="contained" disabled={busy} onClick={() => { void act('approve') }}>Approve now</Button>}
        {canCancel && !row.paused && <Button size="small" variant="outlined" disabled={busy} onClick={() => { void act('cancel') }}>Cancel spend</Button>}
        {canApprove && row.paused && <Button size="small" variant="outlined" disabled={busy} onClick={() => { void act('cancel') }}>Cancel spend</Button>}
      </Stack>
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
    </Paper>
  )
}
