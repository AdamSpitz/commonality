import { publishWorkRequest } from '@commonality/sdk/work-requests'
import { MutableRefUpdaterAbi, PublishedDataAbi } from '@commonality/sdk/abis'
import { Button, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import type { Abi } from 'viem'
import { useAccount } from 'wagmi'
import { useMachinery, useWriteClients } from '../../shared'

export function NewWorkRequestPage() {
  const machinery = useMachinery()
  const clients = useWriteClients()
  const { address } = useAccount()
  const navigate = useNavigate()
  const [slug, setSlug] = useState('')
  const [outcome, setOutcome] = useState('')
  const [requirements, setRequirements] = useState('')
  const [limits, setLimits] = useState('')
  const [deadline, setDeadline] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit() {
    if (!clients || !address) {
      setError('Connect a wallet to publish.')
      return
    }
    const publishedData = machinery.contractAddresses?.publishedData
    const mutableRefUpdater = machinery.contractAddresses?.mutableRefUpdater
    if (!publishedData || !mutableRefUpdater) {
      setError('Publication contracts are not configured.')
      return
    }
    setPending(true)
    setError(null)
    try {
      await publishWorkRequest(clients, {
        publishedData: { address: publishedData, abi: PublishedDataAbi as Abi },
        mutableRefUpdater: { address: mutableRefUpdater, abi: MutableRefUpdaterAbi as Abi },
      }, {
        slug,
        outcome,
        requirements: requirements.split('\n'),
        participationLimits: limits.split('\n'),
        statementCids: [],
        contextNote: '',
        responseDeadline: deadline || null,
        previousCid: null,
      })
      navigate(`/work/requests/${address.toLowerCase()}/${slug.trim().toLowerCase()}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Publish failed.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Stack spacing={2} data-testid="new-work-request" sx={{ maxWidth: 640 }}>
      <Typography variant="h6">Publish a request for work</Typography>
      <Typography variant="body2" color="text.secondary">
        This publishes the outcome and requirements. It does not create a project or spend money.
        A later version does not change offers that named this version.
      </Typography>
      <TextField label="Slug" value={slug} onChange={(event) => setSlug(event.target.value)} />
      <TextField label="Desired outcome" value={outcome} onChange={(event) => setOutcome(event.target.value)} multiline minRows={2} />
      <TextField label="Requirements, one per line" value={requirements} onChange={(event) => setRequirements(event.target.value)} multiline minRows={3} />
      <TextField label="Limits on what participation means, one per line" value={limits} onChange={(event) => setLimits(event.target.value)} multiline minRows={2} />
      <TextField label="Response deadline (ISO time, optional)" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
      {error && <Typography color="error">{error}</Typography>}
      <Button variant="contained" disabled={pending} onClick={() => void submit()}>Publish</Button>
      <Button component={RouterLink} to="/work/requests" sx={{ px: 0, alignSelf: 'flex-start' }}>Cancel</Button>
    </Stack>
  )
}
