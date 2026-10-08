import { useEffect, useState, type DragEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useAccount } from 'wagmi'
import type { StatementDraft } from '../lib/causeModel'
import { statementPublishedSupportTargets } from '../lib/causeModel'
import { publishStatement } from '../lib/publishStatement'
import { checkSafety, sharpenStatement } from '../lib/causeAssistClient'
import { useMachinery } from '../lib/useMachinery'
import { useWriteClients } from '../lib/useWriteClients'
import { SupportButton } from './SupportButton'
import { NeedLogin, useCanSignChain } from './NeedLogin'
import { StatementHistory } from './ChangeHistory'
import { PreviousPublishedVersions } from './PreviousPublishedVersions'
import type { IpfsCidV1 } from '@commonality/sdk/utils'

interface StatementRowProps {
  statement: StatementDraft
  roleLabel: string
  /** Commit text/rationale edit (records history). */
  onCommitEdit?: (input: { text: string; rationale?: string; note?: string }) => void
  /** After successful on-chain publish. */
  onPublished?: (cid: string) => void
  /** Restore an older history version into the tip. */
  onRestoreVersion?: (versionId: string) => void
  /** Remove this goal/belief from the cause (local grouping only). */
  onDelete?: () => void
  /** Reorder among siblings. */
  onMoveUp?: () => void
  onMoveDown?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
  /** Optional HTML5 drag-handle props for reorder by drag. */
  dragHandleProps?: {
    draggable: true
    onDragStart: (e: DragEvent) => void
    onDragEnd: () => void
    'data-drag-handle': true
  }
  supportingNote?: string
  editable?: boolean
  causeDescription?: string
}

export function StatementRow({
  statement,
  roleLabel,
  onCommitEdit,
  onPublished,
  onRestoreVersion,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  dragHandleProps,
  supportingNote,
  editable = true,
  causeDescription,
}: StatementRowProps) {
  const { address } = useAccount()
  const canSign = useCanSignChain()
  const machinery = useMachinery()
  const writeClients = useWriteClients(address)
  const [busy, setBusy] = useState(false)
  const [assistBusy, setAssistBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [example, setExample] = useState<string | null>(null)

  const published = Boolean(statement.cid)
  const [editing, setEditing] = useState(!published)
  const [draftText, setDraftText] = useState(statement.text)
  const [draftRationale, setDraftRationale] = useState(statement.rationale ?? '')

  // Sync when parent reloads statement after commit/publish.
  useEffect(() => {
    setDraftText(statement.text)
    setDraftRationale(statement.rationale ?? '')
    if (statement.cid) setEditing(false)
  }, [statement.id, statement.text, statement.rationale, statement.cid, statement.updatedAt])

  const dirty =
    draftText.trim() !== statement.text.trim()
    || (draftRationale || '') !== (statement.rationale ?? '')

  const canEdit = editable

  const handleSaveEdit = () => {
    if (!draftText.trim()) {
      setError('Write something first.')
      return
    }
    onCommitEdit?.({
      text: draftText,
      rationale: draftRationale || undefined,
      note: published || statement.history.some((h) => h.cid)
        ? 'Revised wording'
        : 'Edited draft',
    })
    setInfo(published ? 'Revision saved as a new draft version. Publish when ready.' : 'Draft saved to history.')
    setError(null)
    if (published) {
      // After revise, parent clears cid — stay in edit mode.
      setEditing(true)
    }
  }

  const handleStartRevise = () => {
    setEditing(true)
    setInfo('Edit the wording, save, then publish to put a new version on-chain. Prior versions stay in history.')
  }

  const handlePublish = async () => {
    // Commit pending local edits first so history matches what we publish.
    if (dirty) {
      onCommitEdit?.({
        text: draftText,
        rationale: draftRationale || undefined,
        note: 'Edited before publish',
      })
    }
    const text = draftText.trim()
    if (!text) {
      setError('Write something first.')
      return
    }
    if (!canSign) {
      setError('Log in and connect your wallet on your profile to publish.')
      return
    }
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      try {
        const safety = await checkSafety([{ text, fieldLabel: roleLabel }])
        const verdict = safety.results[0]
        if (verdict && !verdict.allowed) {
          setError(`Safety check blocked publish: ${verdict.explanation}`)
          setBusy(false)
          return
        }
      } catch {
        // assist offline
      }

      const cid = await publishStatement({
        machinery,
        writeClients,
        text,
      })
      setInfo(`Published. CID: ${cid.slice(0, 18)}…`)
      onPublished?.(cid)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setBusy(false)
    }
  }

  const handleSharpen = async () => {
    if (!draftText.trim()) return
    setAssistBusy(true)
    setError(null)
    setExample(null)
    try {
      const res = await sharpenStatement({
        plank: draftText,
        causeDescription,
      })
      setExample(res.plank)
      setInfo(res.rationale + (res.warnings?.length ? ` Warnings: ${res.warnings.join('; ')}` : ''))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check phrasing')
    } finally {
      setAssistBusy(false)
    }
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 3,
        border: '1px solid',
        borderColor: published && !editing ? 'primary.light' : 'divider',
      }}
      data-testid={`${statement.role}-row`}
    >
      <Stack spacing={1.25}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip size="small" label={roleLabel} color={statement.role === 'goal' ? 'primary' : 'default'} />
          {published && !editing ? (
            <Chip size="small" label="Published" color="success" variant="outlined" />
          ) : published && editing ? (
            <Chip size="small" label="Revising" color="warning" variant="outlined" />
          ) : (
            <Chip size="small" label="Draft" variant="outlined" />
          )}
          {statement.history.length > 1 && (
            <Chip size="small" label={`v${statement.history.length}`} variant="outlined" />
          )}
          {canEdit && (onMoveUp || onMoveDown || dragHandleProps) && (
            <Stack direction="row" spacing={0.25} sx={{ ml: 'auto' }} alignItems="center">
              {dragHandleProps && (
                <Box
                  component="span"
                  {...dragHandleProps}
                  title="Drag to reorder"
                  aria-label={`Drag to reorder ${roleLabel}`}
                  data-testid={`${statement.role}-drag-handle`}
                  sx={{
                    cursor: 'grab',
                    userSelect: 'none',
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 1,
                    color: 'text.secondary',
                    fontSize: 16,
                    lineHeight: 1,
                    '&:active': { cursor: 'grabbing' },
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  ⋮⋮
                </Box>
              )}
              {onMoveUp && (
                <Button
                  size="small"
                  disabled={!canMoveUp}
                  onClick={onMoveUp}
                  sx={{ minWidth: 36, px: 0.5, textTransform: 'none' }}
                  aria-label={`Move ${roleLabel} up`}
                  data-testid={`${statement.role}-move-up`}
                >
                  ↑
                </Button>
              )}
              {onMoveDown && (
                <Button
                  size="small"
                  disabled={!canMoveDown}
                  onClick={onMoveDown}
                  sx={{ minWidth: 36, px: 0.5, textTransform: 'none' }}
                  aria-label={`Move ${roleLabel} down`}
                  data-testid={`${statement.role}-move-down`}
                >
                  ↓
                </Button>
              )}
            </Stack>
          )}
        </Stack>

        {editing && canEdit ? (
          <>
            <TextField
              multiline
              minRows={2}
              fullWidth
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder={statement.role === 'goal'
                ? 'What change in the world do you want?'
                : 'What belief motivates people toward this goal?'}
              inputProps={{ 'data-testid': `${statement.role}-text` }}
            />
            {statement.role === 'belief' && (
              <TextField
                fullWidth
                size="small"
                value={draftRationale}
                onChange={(e) => setDraftRationale(e.target.value)}
                placeholder="Why does this motivate? (optional)"
              />
            )}
          </>
        ) : (
          <>
            <Typography variant="body1" sx={{ fontWeight: 500, whiteSpace: 'pre-wrap' }}>
              {statement.text}
            </Typography>
            {statement.rationale && (
              <Typography variant="body2" color="text.secondary">
                Why it motivates: {statement.rationale}
              </Typography>
            )}
          </>
        )}

        {supportingNote && !statement.rationale && (
          <Typography variant="caption" color="text.secondary">
            {supportingNote}
          </Typography>
        )}

        {published && !editing && statement.cid && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, wordBreak: 'break-all' }}>
              CID: {statement.cid}
            </Typography>
            <SupportButton
              statementCid={statement.cid as IpfsCidV1}
              subject={statement.role === 'goal' ? 'goal' : 'belief'}
            />
          </Box>
        )}

        <PreviousPublishedVersions
          targets={statementPublishedSupportTargets(statement)}
          subject={statement.role === 'goal' ? 'goal' : 'belief'}
        />

        {canEdit && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {editing ? (
              <>
                <Button
                  variant="outlined"
                  disabled={!dirty && !published}
                  onClick={handleSaveEdit}
                  sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 600, minHeight: 40 }}
                  data-testid={`${statement.role}-save`}
                >
                  {published || statement.history.some((h) => h.cid) ? 'Save revision' : 'Save draft'}
                </Button>
                {!canSign ? (
                  <NeedLogin action={`publish this ${roleLabel.toLowerCase()}`} needWallet />
                ) : (
                  <Button
                    variant="contained"
                    disabled={busy || !draftText.trim()}
                    onClick={() => void handlePublish()}
                    sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700, minHeight: 40 }}
                    data-testid={`${statement.role}-publish`}
                  >
                    {busy ? (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CircularProgress size={16} color="inherit" />
                        <span>Publishing…</span>
                      </Stack>
                    ) : (
                      `Publish ${roleLabel.toLowerCase()}`
                    )}
                  </Button>
                )}
                <Button
                  variant="text"
                  disabled={assistBusy || !draftText.trim()}
                  onClick={() => void handleSharpen()}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  {assistBusy ? 'Checking…' : 'Check phrasing'}
                </Button>
                {published && (
                  <Button
                    variant="text"
                    onClick={() => {
                      setDraftText(statement.text)
                      setDraftRationale(statement.rationale ?? '')
                      setEditing(false)
                      setInfo(null)
                    }}
                    sx={{ textTransform: 'none' }}
                  >
                    Cancel
                  </Button>
                )}
              </>
            ) : (
              <Button
                variant="outlined"
                onClick={handleStartRevise}
                sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 600, minHeight: 40 }}
                data-testid={`${statement.role}-revise`}
              >
                Revise wording
              </Button>
            )}
            {onDelete && (
              <Button
                color="error"
                variant="text"
                onClick={() => {
                  const publishedHint = statement.cid || statement.history.some((h) => h.cid)
                    ? ' On-chain published CIDs stay; only this cause drops the reference.'
                    : ''
                  if (window.confirm(`Remove this ${roleLabel.toLowerCase()} from the cause?${publishedHint}`)) {
                    onDelete()
                  }
                }}
                sx={{ textTransform: 'none', fontWeight: 600 }}
                data-testid={`${statement.role}-delete`}
              >
                Remove
              </Button>
            )}
          </Stack>
        )}

        {example && editing && (
          <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              Example rewording (not applied until you choose)
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>{example}</Typography>
            <Button
              size="small"
              sx={{ mt: 0.75, textTransform: 'none', fontWeight: 700 }}
              onClick={() => {
                setDraftText(example)
                setExample(null)
                setInfo('Adopted example into the editor — save or publish when ready.')
              }}
            >
              Use this wording
            </Button>
          </Paper>
        )}

        <StatementHistory
          versions={statement.history ?? []}
          canRestore={canEdit && Boolean(onRestoreVersion)}
          onRestore={(version) => {
            onRestoreVersion?.(version.id)
            setEditing(true)
            setDraftText(version.text)
            setDraftRationale(version.rationale ?? '')
            setInfo('Restored older wording into a new draft tip. Save is already applied — publish when ready.')
          }}
        />

        {error && <Alert severity="error">{error}</Alert>}
        {info && !error && <Alert severity="info" onClose={() => setInfo(null)}>{info}</Alert>}
      </Stack>
    </Paper>
  )
}
