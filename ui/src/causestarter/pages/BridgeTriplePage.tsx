import { useState } from 'react'
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { ClusterMediatorOptIn } from '../components/ClusterMediatorOptIn'
import { ConnectWalletHint } from '../components/ConnectWalletHint'
import {
  applyPublishedCids,
  emptyTripleDraft,
  modifiedToCommonFromTriple,
  parentToModifiedFromTriple,
  textsToPublish,
  validateTripleForPublish,
  type TripleDraft,
  type TripleSide,
} from '../lib/bridgeTriple'
import { publishNudgeBatch } from '../lib/bridgeNudges'
import { formatPairSummary, submitPairsToAttester } from '../lib/implicationAttesterClient'
import { publishPlank } from '../lib/publishPlank'
import { useMachinery, useWriteClients } from '../../shared'

function SideFields({
  title,
  side,
  onChange,
}: {
  title: string
  side: TripleSide
  onChange: (next: TripleSide) => void
}) {
  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
      <Stack spacing={1.5} sx={{ mt: 1.5 }}>
        <TextField
          label="Side label"
          size="small"
          fullWidth
          value={side.label}
          onChange={(event) => onChange({ ...side, label: event.target.value })}
        />
        <TextField
          label="Parent statement CID (if people already signed one)"
          size="small"
          fullWidth
          value={side.parentCid}
          onChange={(event) => onChange({ ...side, parentCid: event.target.value })}
        />
        <TextField
          label="Or write the parent wording"
          size="small"
          fullWidth
          multiline
          minRows={2}
          value={side.parentText}
          onChange={(event) => onChange({ ...side, parentText: event.target.value })}
          disabled={Boolean(side.parentCid.trim())}
        />
        <TextField
          label="Modified wording (still sounds like this side)"
          size="small"
          fullWidth
          multiline
          minRows={2}
          value={side.modifiedText}
          onChange={(event) => onChange({ ...side, modifiedText: event.target.value })}
        />
        {side.modifiedCid && (
          <Typography variant="caption" color="text.secondary">Published modified CID: {side.modifiedCid}</Typography>
        )}
      </Stack>
    </Paper>
  )
}

export function BridgeTriplePage() {
  const machinery = useMachinery()
  const { address, isConnected } = useAccount()
  const writeClients = useWriteClients(address)
  const [draft, setDraft] = useState<TripleDraft>(emptyTripleDraft)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const patch = (partial: Partial<TripleDraft>) => setDraft((current) => ({ ...current, ...partial }))

  const runPublishStatements = async () => {
    const problem = validateTripleForPublish(draft)
    if (problem) {
      setStatus(problem)
      return
    }
    if (!writeClients) {
      setStatus('Connect the mediator wallet first.')
      return
    }
    setBusy(true)
    setStatus('Publishing statements…')
    try {
      const published: Record<string, string> = {}
      for (const item of textsToPublish(draft)) {
        published[item.key] = await publishPlank({ machinery, writeClients, text: item.text })
      }
      const next = applyPublishedCids(draft, published)
      setDraft(next)
      setStatus(
        Object.keys(published).length === 0
          ? 'Statements already have CIDs.'
          : `Published ${Object.keys(published).length} statement(s). Nudges are parent → modified.`,
      )
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const runPublishNudges = async () => {
    if (!writeClients || !address) {
      setStatus('Connect the mediator wallet first.')
      return
    }
    const pairs = parentToModifiedFromTriple(draft)
    if (pairs.length === 0) {
      setStatus('Publish statements first so parent and modified have CIDs.')
      return
    }
    setBusy(true)
    setStatus('Publishing parent→modified nudge batch…')
    try {
      const batch = await publishNudgeBatch({
        writeClients,
        mediatorAddress: address,
        nudges: pairs.map((pair) => ({
          ...pair,
          reason: 'Mediator wording of your side. Signing it still implies the parent statement.',
          confidence: 0.8,
        })),
      })
      setStatus(`Published parent→modified nudges (${batch.batchCid.slice(0, 12)}…).`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const runSubmitPairs = async () => {
    if (!writeClients) {
      setStatus('Connect the mediator wallet first.')
      return
    }
    const pairs = modifiedToCommonFromTriple(draft)
    if (pairs.length === 0) {
      setStatus('Publish modified and common-ground statements first.')
      return
    }
    setBusy(true)
    setStatus('Paying the implication attester for modified→common-ground pairs…')
    try {
      const submitted = await submitPairsToAttester({ writeClients, pairs })
      setStatus(formatPairSummary(submitted.results))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const canOptIn = Boolean(address && draft.mediatorName.trim())

  return (
    <Stack spacing={2.5} data-testid="bridge-triple-page">
      <Box>
        <Typography variant="overline" sx={{ letterSpacing: '0.14em', fontWeight: 700, color: 'primary.main' }}>
          Statement-level triple
        </Typography>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.55rem', sm: '1.9rem' } }}>
          Write a triple yourself
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 640 }}>
          When the sides are not published causes, write two modified wordings and shared
          ground as statements. No <code>bridge-creator</code> process. People subscribe to
          your address. Nudges go parent → modified, never parent → compromise.
          {' '}
          <RouterLink to="/bridge/new">Write a cause cluster instead</RouterLink>
          {' '}if the parents are causes.
        </Typography>
      </Box>

      {!isConnected && (
        <ConnectWalletHint>
          Connect the mediator wallet. Statements and nudge batches publish under your key.
        </ConnectWalletHint>
      )}

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Mediator</Typography>
        <Stack spacing={1.5} sx={{ mt: 1.5 }}>
          <TextField
            label="Mediator name"
            size="small"
            fullWidth
            value={draft.mediatorName}
            onChange={(event) => patch({ mediatorName: event.target.value })}
          />
          <TextField
            label="Public note"
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={draft.mediatorNote}
            onChange={(event) => patch({ mediatorNote: event.target.value })}
          />
        </Stack>
      </Paper>

      <SideFields title="Side A" side={draft.sideA} onChange={(sideA) => patch({ sideA })} />
      <SideFields title="Side B" side={draft.sideB} onChange={(sideB) => patch({ sideB })} />

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Shared ground</Typography>
        <TextField
          label="Common-ground statement"
          size="small"
          fullWidth
          multiline
          minRows={2}
          sx={{ mt: 1.5 }}
          value={draft.commonGroundText}
          onChange={(event) => patch({ commonGroundText: event.target.value })}
        />
        {draft.commonGroundCid && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Published CID: {draft.commonGroundCid}
          </Typography>
        )}
      </Paper>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
        <Button
          variant="contained"
          disabled={busy}
          sx={{ textTransform: 'none' }}
          onClick={() => void runPublishStatements()}
          data-testid="triple-publish-statements"
        >
          Publish statements
        </Button>
        <Button
          variant="outlined"
          disabled={busy || parentToModifiedFromTriple(draft).length === 0}
          sx={{ textTransform: 'none' }}
          onClick={() => void runPublishNudges()}
          data-testid="triple-publish-nudges"
        >
          Publish parent→modified nudges
        </Button>
        <Button
          variant="outlined"
          disabled={busy || modifiedToCommonFromTriple(draft).length === 0}
          sx={{ textTransform: 'none' }}
          onClick={() => void runSubmitPairs()}
          data-testid="triple-submit-pairs"
        >
          Submit modified→common-ground pairs
        </Button>
      </Stack>

      {status && <Alert severity="info" sx={{ borderRadius: 2, whiteSpace: 'pre-wrap' }}>{status}</Alert>}

      {canOptIn && address && (
        <ClusterMediatorOptIn
          fields={{
            mediatorAddress: address.toLowerCase() as `0x${string}`,
            mediatorName: draft.mediatorName,
            mediatorNote: draft.mediatorNote,
          }}
        />
      )}
    </Stack>
  )
}
