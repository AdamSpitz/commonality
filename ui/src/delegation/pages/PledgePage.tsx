import { useEffect, useState } from 'react'
import { Alert, Box, Button, Chip, Paper, Stack, Switch, TextField, Typography } from '@mui/material'
import { useParams } from 'react-router-dom'
import { useAccount, usePublicClient } from 'wagmi'
import type { Address } from 'viem'
import { isAddress } from 'viem'
import { RecurringPledgesAbi } from '@commonality/sdk/abis'
import { hashBeneficiaryId, normalizeDnsBeneficiary } from '@commonality/sdk/content-funding'
import { setPledgeFineListed, setPledgeUnsuspiciousDelay, updatePledgeSpendPolicy } from '@commonality/sdk/delegation'
import { useWriteClients } from '../../shared'
import { hoursInputToSeconds, secondsToHourInput } from '../spendClass'

function pledgeContract() {
  const addr = import.meta.env.VITE_RECURRING_PLEDGES_CONTRACT_ADDRESS
  if (!addr) return null
  return { address: addr as Address, abi: RecurringPledgesAbi }
}

export function PledgePage() {
  const { pledgeId: pledgeIdParam } = useParams()
  const pledgeId = pledgeIdParam && /^\d+$/.test(pledgeIdParam) ? BigInt(pledgeIdParam) : null
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const clients = useWriteClients(address)
  const [owner, setOwner] = useState<Address | null>(null)
  const [active, setActive] = useState(true)
  const [waitHours, setWaitHours] = useState('0')
  const [listedWaitHours, setListedWaitHours] = useState('0')
  const [showListedWait, setShowListedWait] = useState(false)
  const [strictMode, setStrict] = useState(false)
  const [flaggers, setFlaggers] = useState<Address[]>([])
  const [flaggerInput, setFlaggerInput] = useState('')
  const [names, setNames] = useState<`0x${string}`[]>([])
  const [nameInput, setNameInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!publicClient || pledgeId === null) return
    const contract = pledgeContract()
    if (!contract) return
    let cancelled = false
    ;(async () => {
      const pledge = await publicClient.readContract({
        ...contract,
        functionName: 'pledges',
        args: [pledgeId],
      })
      const listedFlaggers = await publicClient.readContract({
        ...contract,
        functionName: 'pledgeFlaggers',
        args: [pledgeId],
      }) as Address[]
      const fineList = await publicClient.readContract({
        ...contract,
        functionName: 'pledgeFineList',
        args: [pledgeId],
      }) as `0x${string}`[]
      if (cancelled) return
      setOwner(pledge[0])
      setActive(pledge[8])
      setWaitHours(secondsToHourInput(pledge[9]))
      setListedWaitHours(secondsToHourInput(pledge[10]))
      setShowListedWait(pledge[10] > 0n)
      setStrict(pledge[11])
      setFlaggers(listedFlaggers)
      setNames(fineList)
      setLoaded(true)
    })().catch(() => {
      if (!cancelled) setError('Could not read this pledge')
    })
    return () => { cancelled = true }
  }, [publicClient, pledgeId, busy])

  if (pledgeId === null) {
    return <Alert severity="error">This pledge link is not valid.</Alert>
  }

  const contract = pledgeContract()
  const canEdit = Boolean(clients && contract && address && owner && address.toLowerCase() === owner.toLowerCase() && active)
  const id = pledgeId

  async function saveTemplate() {
    if (!clients || !contract || !canEdit) return
    const wait = hoursInputToSeconds(waitHours.trim() === '' ? '0' : waitHours)
    const listedWait = showListedWait
      ? hoursInputToSeconds(listedWaitHours.trim() === '' ? '0' : listedWaitHours)
      : 0n
    if (wait === null || listedWait === null) {
      setError('Enter the wait in hours, or leave it empty for none')
      return
    }
    if (listedWait > wait) {
      setError('The wait for a listed name cannot be longer than the ordinary wait')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await updatePledgeSpendPolicy(clients, contract, {
        pledgeId: id,
        spendDelay: wait,
        strictMode,
        flaggers,
      })
      const savedListedWait = listedWait > wait ? wait : listedWait
      await setPledgeUnsuspiciousDelay(clients, contract, { pledgeId: id, delay: savedListedWait })
      if (savedListedWait !== listedWait) setListedWaitHours(secondsToHourInput(savedListedWait))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this pledge')
    } finally {
      setBusy(false)
    }
  }

  async function changeName(beneficiaryId: `0x${string}`, allowed: boolean) {
    if (!clients || !contract || !canEdit) return
    setBusy(true)
    setError(null)
    try {
      await setPledgeFineListed(clients, contract, { pledgeId: id, beneficiaryId, allowed })
      setNameInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change that name')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>Monthly pledge #{pledgeId.toString()}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        A save applies to notes minted afterward, not to notes already minted. Change a note that already exists from that note's page.
      </Typography>
      {!contract && <Alert severity="error">Recurring pledges are not configured.</Alert>}
      {loaded && !active && <Alert severity="info" sx={{ mb: 2 }}>This pledge is cancelled. Future notes will not be minted.</Alert>}
      {loaded && address && owner && address.toLowerCase() !== owner.toLowerCase() && (
        <Alert severity="info" sx={{ mb: 2 }}>Only the donor can edit what future notes inherit.</Alert>
      )}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Wait before a spend completes</Typography>
        <TextField
          size="small"
          label="Wait (hours)"
          value={waitHours}
          onChange={(event) => setWaitHours(event.target.value)}
          disabled={!canEdit || busy}
          helperText="This is the wait stored on the pledge, not a suggestion."
          sx={{ mb: 1 }}
        />
        {!showListedWait && (
          <Box>
            <Button size="small" disabled={!canEdit} onClick={() => setShowListedWait(true)}>Wait before paying a listed name too</Button>
          </Box>
        )}
        {showListedWait && (
          <TextField
            size="small"
            label="Wait for a listed name (hours)"
            value={listedWaitHours}
            onChange={(event) => setListedWaitHours(event.target.value)}
            disabled={!canEdit || busy}
            helperText="Zero pays that name immediately, and you cannot cancel it."
            sx={{ mt: 1 }}
          />
        )}
        <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>Names that can be paid immediately</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          A payment that goes straight to the wallet that currently controls one of these names uses the listed-name wait. A project that holds the money for later keeps the ordinary wait. Adding or removing a name saves immediately.
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
          {names.length === 0 && <Typography variant="body2">No names yet.</Typography>}
          {names.map((id) => (
            <Chip key={id} label={id} size="small" disabled={!canEdit || busy} onDelete={() => { void changeName(id, false) }} />
          ))}
        </Stack>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField size="small" label="Website" value={nameInput} onChange={(event) => setNameInput(event.target.value)} placeholder="example.org" disabled={!canEdit || busy} />
          <Button
            variant="outlined"
            disabled={!canEdit || busy || nameInput.trim() === ''}
            onClick={() => {
              try {
                void changeName(hashBeneficiaryId('dns', normalizeDnsBeneficiary(nameInput)), true)
              } catch {
                setError('Enter a website, such as example.org')
              }
            }}
          >
            Add name
          </Button>
        </Box>
        <Typography variant="subtitle2" gutterBottom>Someone can pause a spend that is waiting</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          The wait, this switch, and the flaggers are saved together by the button below.
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Switch checked={strictMode} disabled={!canEdit || busy} onChange={(_, checked) => setStrict(checked)} />
          <Typography variant="body2">Strict mode: a flagger pauses the spend. Off, the countdown continues.</Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
          {flaggers.length === 0 && <Typography variant="body2">No flaggers.</Typography>}
          {flaggers.map((flagger) => (
            <Chip
              key={flagger}
              label={flagger}
              size="small"
              disabled={!canEdit || busy}
              onDelete={() => setFlaggers(flaggers.filter((item) => item !== flagger))}
            />
          ))}
        </Stack>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField size="small" label="Flagger address" value={flaggerInput} onChange={(event) => setFlaggerInput(event.target.value)} placeholder="0x..." disabled={!canEdit || busy} />
          <Button
            variant="outlined"
            disabled={!canEdit || busy || !isAddress(flaggerInput)}
            onClick={() => {
              const next = flaggerInput as Address
              setFlaggers((current) => current.some((item) => item.toLowerCase() === next.toLowerCase()) ? current : [...current, next])
              setFlaggerInput('')
            }}
          >
            Add flagger
          </Button>
        </Box>
        <Button variant="contained" disabled={!canEdit || busy} onClick={() => { void saveTemplate() }}>Save for future notes</Button>
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      </Paper>
    </Box>
  )
}
