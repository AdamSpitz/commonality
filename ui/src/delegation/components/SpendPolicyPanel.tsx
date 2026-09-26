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
}: {
  noteId: bigint
  contractAddress: Address
  owners: Address[]
}) {
  const publicClient = usePublicClient()
  const clients = useWriteClients()
  const [delayHours, setDelayHours] = useState('0')
  const [unsuspiciousHours, setUnsuspiciousHours] = useState('0')
  const [strictMode, setStrict] = useState(false)
  const [flaggers, setFlaggers] = useState<Address[]>([])
  const [flaggerInput, setFlaggerInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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
      setUnsuspiciousHours(secondsToHourInput(policy[1]))
      setStrict(policy[2])
      setFlaggers(listed)
    })().catch(() => {
      if (!cancelled) setError('Could not read the spend delay')
    })
    return () => { cancelled = true }
  }, [publicClient, contractAddress, noteId, busy])

  async function saveDelays() {
    if (!clients) return
    const delay = hoursInputToSeconds(delayHours)
    const unsuspicious = hoursInputToSeconds(unsuspiciousHours)
    if (delay === null || unsuspicious === null) {
      setError('Enter the delays in hours')
      return
    }
    if (unsuspicious > delay) {
      setError('The shorter delay cannot be longer than the standing delay')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const contract = { address: contractAddress, abi: DelegatableNotesAbi }
      await setSpendDelay(clients, contract, { noteId, owners, delay })
      await setUnsuspiciousDelay(clients, contract, { noteId, owners, delay: unsuspicious })
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
      await setStrictMode(clients, { address: contractAddress, abi: DelegatableNotesAbi }, { noteId, owners, enabled })
      setStrict(enabled)
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
      await setSpendFlagger(clients, { address: contractAddress, abi: DelegatableNotesAbi }, {
        noteId, owners, flagger, allowed,
      })
      setFlaggerInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change that flagger')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="subtitle2" gutterBottom>Delay before a delegate spend completes</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        A delay above zero means the delegate schedules the whole note. You can cancel it until it completes. A spend already scheduled keeps the deadline it was given, unless its class changes.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1 }}>
        <TextField size="small" label="Standing delay (hours)" value={delayHours} onChange={(event) => setDelayHours(event.target.value)} />
        <TextField size="small" label="Unsuspicious delay (hours)" value={unsuspiciousHours} onChange={(event) => setUnsuspiciousHours(event.target.value)} helperText="Must be at most the standing delay. Zero completes in the delegate's transaction." />
        <Button variant="outlined" disabled={busy} onClick={() => { void saveDelays() }}>Save delays</Button>
      </Stack>
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
