import { useEffect, useState } from 'react'
import { Alert, Box, Button, Chip, Paper, Stack, TextField, Typography } from '@mui/material'
import { usePublicClient } from 'wagmi'
import type { Address } from 'viem'
import { DelegatableNotesAbi } from '@commonality/sdk/abis'
import { hashBeneficiaryId, normalizeDnsBeneficiary } from '@commonality/sdk/content-funding'
import { setFineListed } from '@commonality/sdk/delegation'
import { useWriteClients } from '../../shared'
import { spendClassLabel } from '../spendClass'

export function FineListPanel({
  noteId,
  contractAddress,
  owners,
  onChanged,
}: {
  noteId: bigint
  contractAddress: Address
  owners: Address[]
  onChanged?: () => Promise<void>
}) {
  const publicClient = usePublicClient()
  const clients = useWriteClients()
  const [domain, setDomain] = useState('')
  const [names, setNames] = useState<string[]>([])
  const [pendingLabel, setPendingLabel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!publicClient) return
    let cancelled = false
    const contract = { address: contractAddress, abi: DelegatableNotesAbi } as const
    ;(async () => {
      const listed = await publicClient.readContract({
        ...contract,
        functionName: 'fineList',
        args: [noteId],
      }) as `0x${string}`[]
      const pending = await publicClient.readContract({
        ...contract,
        functionName: 'pendingSpends',
        args: [noteId],
      }) as readonly [Address, Address, bigint, bigint, bigint, bigint, bigint, boolean, boolean]
      let label: string | null = null
      if (pending[8]) {
        const classified = await publicClient.readContract({
          ...contract,
          functionName: 'effectiveSpendDelay',
          args: [noteId, pending[0]],
        }) as readonly [bigint, number]
        label = spendClassLabel(Number(classified[1]))
      }
      if (!cancelled) {
        setNames(listed)
        setPendingLabel(label)
      }
    })().catch(() => {
      if (!cancelled) {
        setNames([])
        setPendingLabel(null)
      }
    })
    return () => { cancelled = true }
  }, [publicClient, contractAddress, noteId, busy])

  async function addName() {
    if (!clients) return
    setBusy(true)
    setError(null)
    try {
      const canonical = normalizeDnsBeneficiary(domain)
      const hash = await setFineListed(clients, { address: contractAddress, abi: DelegatableNotesAbi }, {
        noteId,
        owners,
        beneficiaryId: hashBeneficiaryId('dns', canonical),
        allowed: true,
      })
      const receipt = await clients.publicClient.waitForTransactionReceipt({ hash })
      if (receipt.status !== 'success') throw new Error('The fine list update reverted')
      setDomain('')
      await onChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that name')
    } finally {
      setBusy(false)
    }
  }

  async function removeName(beneficiaryId: `0x${string}`) {
    if (!clients) return
    setBusy(true)
    setError(null)
    try {
      const hash = await setFineListed(clients, { address: contractAddress, abi: DelegatableNotesAbi }, {
        noteId, owners, beneficiaryId, allowed: false,
      })
      const receipt = await clients.publicClient.waitForTransactionReceipt({ hash })
      if (receipt.status !== 'success') throw new Error('The fine list update reverted')
      await onChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that name')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="subtitle2" gutterBottom>Names that can be paid immediately</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        A payment that goes straight to the wallet that currently controls one of these names completes immediately. You cannot cancel it. A project that holds the money to be claimed later, or that pays a different wallet, keeps the ordinary wait.
      </Typography>
      {pendingLabel && (
        <Chip label={`Pending spend: ${pendingLabel}`} size="small" color={pendingLabel === 'On your list' ? 'success' : 'default'} sx={{ mb: 1 }} />
      )}
      <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
        {names.length === 0 && <Typography variant="body2">No names yet.</Typography>}
        {names.map((id) => <Chip key={id} label={id} size="small" disabled={busy} onDelete={() => { void removeName(id as `0x${string}`) }} />)}
      </Stack>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField size="small" label="Website" value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="example.org" />
        <Button variant="outlined" disabled={busy || domain.trim() === ''} onClick={() => { void addName() }}>Add</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
    </Paper>
  )
}
