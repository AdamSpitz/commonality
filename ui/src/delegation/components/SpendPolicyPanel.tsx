import { useEffect, useState } from 'react'
import { Alert, Box, Button, Chip, Paper, Stack, Switch, TextField, Typography } from '@mui/material'
import { usePublicClient } from 'wagmi'
import type { Address } from 'viem'
import { isAddress } from 'viem'
import { DelegatableNotesAbi } from '@commonality/sdk/abis'
import { setSpendDelay, setSpendFlagger, setStrictMode, setUnsuspiciousDelay } from '@commonality/sdk/delegation'
import { useWriteClients } from '../../shared'
import { hoursInputToSeconds, secondsToHourInput } from '../spendClass'

export function SpendPolicyPanel({
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
  const [delayHours, setDelayHours] = useState('0')
  const [listedWaitHours, setListedWaitHours] = useState('0')
  const [showListedWait, setShowListedWait] = useState(false)
  const [strictMode, setStrict] = useState(false)
  const [flaggers, setFlaggers] = useState<Address[]>([])
  const [flaggerInput, setFlaggerInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function waitForUpdate(hash: `0x${string}`) {
    if (!clients) return
    const receipt = await clients.publicClient.waitForTransactionReceipt({ hash })
    if (receipt.status !== 'success') throw new Error('The spend policy update reverted')
  }

  useEffect(() => {
    if (!publicClient) return
    let cancelled = false
    const contract = { address: contractAddress, abi: DelegatableNotesAbi } as const
    ;(async () => {
      const policy = await publicClient.readContract({
        ...contract,
        functionName: 'spendPolicies',
        args: [noteId],
      }) as readonly [bigint, bigint, boolean]
      const listed = await publicClient.readContract({
        ...contract,
        functionName: 'spendFlaggers',
        args: [noteId],
      }) as Address[]
      if (cancelled) return
      setDelayHours(secondsToHourInput(policy[0]))
      setListedWaitHours(secondsToHourInput(policy[1]))
      if (policy[1] > 0n) setShowListedWait(true)
      setStrict(policy[2])
      setFlaggers(listed)
    })().catch(() => {
      if (!cancelled) setError('Could not read the spend delay')
    })
    return () => { cancelled = true }
  }, [publicClient, contractAddress, noteId, busy])

  async function saveDelays() {
    if (!clients) return
    const delay = hoursInputToSeconds(delayHours.trim() === '' ? '0' : delayHours)
    const listedWait = showListedWait
      ? hoursInputToSeconds(listedWaitHours.trim() === '' ? '0' : listedWaitHours)
      : 0n
    if (delay === null || listedWait === null) {
      setError('Enter the wait in hours, or leave it empty for none')
      return
    }
    if (listedWait > delay) {
      setError('The wait for a listed name cannot be longer than the ordinary wait')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const contract = { address: contractAddress, abi: DelegatableNotesAbi }
      await waitForUpdate(await setSpendDelay(clients, contract, { noteId, owners, delay }))
      await waitForUpdate(await setUnsuspiciousDelay(clients, contract, { noteId, owners, delay: listedWait }))
      await onChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the delay')
    } finally {
      setBusy(false)
    }
  }

  async function saveStrict(enabled: boolean) {
    if (!clients) return
    setBusy(true)
    setError(null)
    try {
      await waitForUpdate(await setStrictMode(clients, { address: contractAddress, abi: DelegatableNotesAbi }, { noteId, owners, enabled }))
      setStrict(enabled)
      await onChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change strict mode')
    } finally {
      setBusy(false)
    }
  }

  async function changeFlagger(flagger: Address, allowed: boolean) {
    if (!clients) return
    setBusy(true)
    setError(null)
    try {
      await waitForUpdate(await setSpendFlagger(clients, { address: contractAddress, abi: DelegatableNotesAbi }, {
        noteId, owners, flagger, allowed,
      }))
      setFlaggerInput('')
      await onChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change that flagger')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="subtitle2" gutterBottom>Wait before a spend completes</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Other payments wait this long, and you can cancel them until they complete. A spend already scheduled keeps the deadline it was given, unless you change who is on your list.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1 }}>
        <TextField size="small" label="Wait (hours)" value={delayHours} onChange={(event) => setDelayHours(event.target.value)} helperText="Empty means no wait." />
        <Button variant="outlined" disabled={busy} onClick={() => { void saveDelays() }}>Save wait</Button>
      </Stack>
      {!showListedWait && (
        <Button size="small" sx={{ mb: 1 }} onClick={() => setShowListedWait(true)}>Wait before paying a listed name too</Button>
      )}
      {showListedWait && (
        <TextField
          size="small"
          label="Wait for a listed name (hours)"
          value={listedWaitHours}
          onChange={(event) => setListedWaitHours(event.target.value)}
          helperText="Zero pays that name immediately, and you cannot cancel it. It cannot be longer than the ordinary wait."
          sx={{ mb: 1 }}
        />
      )}
      <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>Someone can pause a spend that is waiting</Typography>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Switch checked={strictMode} disabled={busy} onChange={(_, checked) => { void saveStrict(checked) }} />
        <Typography variant="body2">Strict mode: a flagger pauses the spend. Off, the countdown continues.</Typography>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
        {flaggers.length === 0 && <Typography variant="body2">No flaggers.</Typography>}
        {flaggers.map((flagger) => (
          <Chip key={flagger} label={flagger} size="small" onDelete={() => { void changeFlagger(flagger, false) }} />
        ))}
      </Stack>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField size="small" label="Flagger address" value={flaggerInput} onChange={(event) => setFlaggerInput(event.target.value)} placeholder="0x..." />
        <Button
          variant="outlined"
          disabled={busy || !isAddress(flaggerInput)}
          onClick={() => { void changeFlagger(flaggerInput as Address, true) }}
        >
          Add flagger
        </Button>
      </Box>
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
    </Paper>
  )
}
