import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, CircularProgress, IconButton, Paper, Stack,
  TextField, Tooltip, Typography,
} from '@mui/material'
import { InfoChip } from '@ui/shared'
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import { Link as RouterLink } from 'react-router-dom'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { SupportButton, type SupportSettledInfo } from './SupportButton'
import { StatementSupportStats, type StatementSupportCounts } from './StatementSupportStats'
import type { CausePlank } from '../lib/causeStore'
import { readPlankText } from '../lib/causeRoster'
import { useMachinery } from '../../shared'

function looksLikeCid(text: string): boolean {
  const trimmed = text.trim()
  return /^(bafkrei|bafy|Qm)[a-z0-9]+$/i.test(trimmed) && !trimmed.includes(' ')
}

function usePublishedPlankText(plank: CausePlank): string {
  const machinery = useMachinery()
  const [resolved, setResolved] = useState(plank.text)
  useEffect(() => {
    setResolved(plank.text)
    if (!plank.cid) return
    const placeholder = !plank.text.trim() || plank.text.trim() === plank.cid || looksLikeCid(plank.text)
    if (!placeholder) return
    let cancelled = false
    void readPlankText(machinery, plank.cid).then((text) => {
      if (!cancelled && text) setResolved(text)
    })
    return () => {
      cancelled = true
    }
  }, [machinery, plank.cid, plank.text])
  return resolved
}

/** Below this, a plank is too vague for the attester to draw an arrow either way. */
export const MIN_PLANK_LENGTH = 12

/** Coaching notes from a phrasing review — never auto-applied to the field. */
export interface PlankReview {
  /** Why the current wording works or falls short for attestation / signing. */
  summary: string
  /** Concrete problems the organizer should fix in their own words. */
  issues: string[]
  /**
   * Optional rephrasing the model thought of. Shown only as an example the
   * organizer may copy — never written into the text field without a click.
   */
  exampleWording?: string
}

export type PlankSupport = StatementSupportCounts

interface PlankRowProps {
  plank: CausePlank
  index: number
  /** Whether this plank is included in the current view's set operations. */
  selected: boolean
  onSelectedChange: (selected: boolean) => void
  support: PlankSupport | undefined
  supportLoading: boolean
  projectCount: number
  onSupported: (info: SupportSettledInfo) => void
  // Owner-only editing. A published plank is immutable, so these apply to drafts.
  onTextChange: (text: string) => void
  onDelete: () => void
  /** Request a phrasing review (feedback only; does not rewrite the field). */
  onReview: () => void
  onPublish: () => void
  reviewing: boolean
  publishing: boolean
  /** Another cause mutation is in flight, so all draft controls are locked. */
  mutationLocked?: boolean
  /** Latest review for this draft, if any. */
  review?: PlankReview | null
  /** Explicit opt-in: put the example wording into the text field. */
  onUseExampleWording?: (wording: string) => void
  /**
   * Provenance from roster history: issue first appeared after the initial
   * published roster (e.g. "Added later · 3 days ago").
   */
  addedLaterLabel?: string
}

export function PlankRow({
  plank, index, selected, onSelectedChange, support, supportLoading, projectCount,
  onSupported, onTextChange, onDelete, onReview, onPublish, reviewing, publishing,
  mutationLocked = false,
  review = null,
  onUseExampleWording,
  addedLaterLabel,
}: PlankRowProps) {
  const published = Boolean(plank.cid)
  const displayText = usePublishedPlankText(plank)
  const tooShort = plank.text.trim().length > 0 && plank.text.trim().length < MIN_PLANK_LENGTH
  const blocked = Boolean(plank.safety && !plank.safety.allowed)
  const draftBusy = mutationLocked || publishing || reviewing
  const example = review?.exampleWording?.trim()
  const exampleDiffers = Boolean(example && example !== plank.text.trim())

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.25,
        borderRadius: 2,
        ...(published
          ? selected
            ? {
                bgcolor: 'action.selected',
                borderColor: 'primary.main',
              }
            : {
                opacity: 0.48,
                borderStyle: 'dashed',
              }
          : {}),
      }}
      data-testid={published ? 'plank-row-published' : 'plank-row-draft'}
    >
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
          {published ? (
            <Stack direction="row" spacing={0.5} alignItems="flex-start">
              <Typography variant="body2" sx={{ fontWeight: 500, flex: 1, minWidth: 0 }}>
                {displayText}
              </Typography>
              <Tooltip title="Open this statement">
                <IconButton
                  component={RouterLink}
                  to={`/statement/${plank.cid}?mode=sign`}
                  size="small"
                  aria-label="Open this statement"
                  sx={{ mt: -0.5, mr: -0.5, color: 'text.secondary' }}
                >
                  <OpenInNewIcon sx={{ fontSize: 16 }} aria-hidden />
                </IconButton>
              </Tooltip>
            </Stack>
          ) : (
            <TextField
              value={plank.text}
              onChange={(event) => onTextChange(event.target.value)}
              multiline
              minRows={2}
              fullWidth
              size="small"
              disabled={draftBusy}
              placeholder="One statement a supporter could sincerely sign, on its own."
              error={tooShort || blocked}
              helperText={
                blocked
                  ? plank.safety?.explanation
                  : tooShort
                    ? 'Too vague to attest yet. Say what a supporter actually believes.'
                    : 'Keep this specific, self-contained, and natural to sign.'
              }
              slotProps={{ htmlInput: { 'data-testid': `plank-text-${index}` } }}
            />
          )}

          {published && (
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              justifyContent="space-between"
              flexWrap="wrap"
              useFlexGap
            >
              <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                <SupportButton
                  statementCid={plank.cid as IpfsCidV1}
                  onSupported={onSupported}
                  subject="statement"
                  label="Sign"
                  compact
                  showConnectPrompt={false}
                />
                <StatementSupportStats
                  statementCid={plank.cid!}
                  support={support}
                  supportLoading={supportLoading}
                  projectCount={projectCount}
                />
                {addedLaterLabel && (
                  <InfoChip
                    size="small"
                    variant="outlined"
                    label={addedLaterLabel}
                    data-testid={`plank-added-later-${index}`}
                    sx={{ borderStyle: 'dashed' }}
                    title="This statement was added after the cause was first published. Earlier signers did not see it when they signed."
                  />
                )}
              </Stack>
              <Tooltip title="Include this statement in the signer totals and in Sign selected statements. Does not sign or retract by itself.">
                <IconButton
                  size="small"
                  aria-pressed={selected}
                  aria-label={
                    selected
                      ? `Deselect statement ${index + 1} from totals and batch sign`
                      : `Select statement ${index + 1} in totals and batch sign`
                  }
                  data-testid={`plank-in-totals-${index}`}
                  onClick={() => onSelectedChange(!selected)}
                  sx={{ color: 'text.secondary' }}
                >
                  {selected
                    ? <VisibilityOutlinedIcon fontSize="small" />
                    : <VisibilityOffOutlinedIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Stack>
          )}

          {!published && review && (
            <Alert
              severity={review.issues.length > 0 ? 'warning' : 'info'}
              sx={{ borderRadius: 2 }}
              data-testid={`plank-review-${index}`}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Phrasing feedback
              </Typography>
              {review.summary && (
                <Typography variant="body2" sx={{ mb: review.issues.length > 0 ? 1 : 0 }}>
                  {review.summary}
                </Typography>
              )}
              {review.issues.length > 0 && (
                <Box component="ul" sx={{ m: 0, pl: 2.25 }}>
                  {review.issues.map((issue) => (
                    <Typography key={issue} component="li" variant="body2">
                      {issue}
                    </Typography>
                  ))}
                </Box>
              )}
              {exampleDiffers && example && (
                <Box sx={{ mt: 1.25 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Example rephrasing (not applied unless you choose it):
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontStyle: 'italic', mb: 1 }}
                    data-testid={`plank-review-example-${index}`}
                  >
                    {example}
                  </Typography>
                  {onUseExampleWording && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => onUseExampleWording(example)}
                      disabled={draftBusy}
                      sx={{ textTransform: 'none' }}
                      data-testid={`plank-use-example-${index}`}
                    >
                      Use this wording
                    </Button>
                  )}
                </Box>
              )}
            </Alert>
          )}

          {!published && (
          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                <Button
                  variant="contained"
                  size="small"
                  onClick={onPublish}
                  disabled={draftBusy || tooShort || plank.text.trim().length === 0}
                  sx={{ textTransform: 'none' }}
                  data-testid={`plank-publish-${index}`}
                >
                  {publishing ? 'Publishing…' : 'Publish statement'}
                </Button>
                <Button
                  size="small"
                  startIcon={reviewing ? <CircularProgress size={14} /> : <RateReviewOutlinedIcon fontSize="small" />}
                  onClick={onReview}
                  disabled={draftBusy || plank.text.trim().length === 0}
                  sx={{ textTransform: 'none' }}
                  data-testid={`plank-review-button-${index}`}
                >
                  {reviewing ? 'Checking…' : 'Check phrasing'}
                </Button>
          </Stack>
          )}
        </Stack>

        {!published && (
          <Tooltip title="Remove statement">
            <span>
              <IconButton
                size="small"
                onClick={onDelete}
                disabled={draftBusy}
                aria-label={`Remove statement ${index + 1}`}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Stack>
    </Paper>
  )
}
