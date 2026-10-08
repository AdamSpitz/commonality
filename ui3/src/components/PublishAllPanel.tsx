import { useState } from 'react'
import {
  Alert,
  Button,
  CircularProgress,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useAccount } from 'wagmi'
import type { CauseRecord, StatementDraft } from '../lib/causeModel'
import { draftStatements, markBeliefPublished, markGoalPublished } from '../lib/causeModel'
import { checkSafety } from '../lib/causeAssistClient'
import { publishStatement } from '../lib/publishStatement'
import { useMachinery } from '../lib/useMachinery'
import { useWriteClients } from '../lib/useWriteClients'
import { NeedLogin, useCanSignChain } from './NeedLogin'

interface PublishAllPanelProps {
  cause: CauseRecord
  onProgress?: () => void
}

export function PublishAllPanel({ cause, onProgress }: PublishAllPanelProps) {
  const { address } = useAccount()
  const canSign = useCanSignChain()
  const machinery = useMachinery()
  const writeClients = useWriteClients(address)
  const drafts = draftStatements(cause)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)

  if (drafts.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Publish status</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Goal and beliefs with text are published (or empty). Supporters can stand with live statements.
        </Typography>
      </Paper>
    )
  }

  const run = async () => {
    if (!canSign || !writeClients) {
      setError('Log in and connect your wallet on your profile first.')
      return
    }
    setBusy(true)
    setError(null)
    setSummary(null)
    setDone(0)
    let published = 0
    let skipped = 0

    for (const draft of drafts) {
      try {
        try {
          const safety = await checkSafety([{ text: draft.text, fieldLabel: draft.role }])
          if (safety.results[0] && !safety.results[0].allowed) {
            skipped += 1
            setDone((n) => n + 1)
            continue
          }
        } catch {
          // assist offline
        }
        const cid = await publishStatement({ machinery, writeClients, text: draft.text })
        applyCid(cause.id, draft, cid, address)
        published += 1
        setDone((n) => n + 1)
        onProgress?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Publish failed mid-batch')
        setBusy(false)
        onProgress?.()
        return
      }
    }
    setSummary(
      `Published ${published} statement${published === 1 ? '' : 's'}`
      + (skipped ? `; skipped ${skipped} blocked by safety` : '')
      + '.',
    )
    setBusy(false)
    onProgress?.()
  }

  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'primary.light' }} data-testid="publish-all-panel">
      <Stack spacing={1.25}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Publish goal &amp; beliefs
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {drafts.length} draft{drafts.length === 1 ? '' : 's'} ready so supporters can stand by them on-chain.
        </Typography>
        {!canSign ? (
          <NeedLogin action="publish drafts" needWallet />
        ) : (
          <Button
            variant="contained"
            disabled={busy}
            onClick={() => void run()}
            sx={{ alignSelf: 'flex-start', borderRadius: 999, textTransform: 'none', fontWeight: 700, minHeight: 44 }}
            data-testid="publish-all-button"
          >
            {busy ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={16} color="inherit" />
                <span>Publishing {done}/{drafts.length}…</span>
              </Stack>
            ) : (
              `Publish all drafts (${drafts.length})`
            )}
          </Button>
        )}
        {busy && (
          <LinearProgress
            variant="determinate"
            value={drafts.length ? (done / drafts.length) * 100 : 0}
            sx={{ borderRadius: 1 }}
          />
        )}
        {error && <Alert severity="error">{error}</Alert>}
        {summary && <Alert severity="success">{summary}</Alert>}
      </Stack>
    </Paper>
  )
}

function applyCid(causeId: string, draft: StatementDraft, cid: string, author?: string): void {
  if (draft.role === 'goal') {
    markGoalPublished(causeId, cid, author)
  } else {
    markBeliefPublished(causeId, draft.id, cid, author)
  }
}
