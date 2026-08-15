import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, IconButton, Paper, Stack,
  TextField, Tooltip, Typography,
} from '@mui/material'
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { Link as RouterLink } from 'react-router-dom'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { SupportButton, type SupportSettledInfo } from './SupportButton'
import type { CausePlank } from '../lib/causeStore'

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

export interface PlankSupport {
  direct: number
  indirect: number
  total: number
}

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

function supportSummary(support: PlankSupport | undefined, loading: boolean): string {
  if (!support) return loading ? 'Counting supporters…' : 'Supporters unavailable'
  // Keep both provenance categories visible even when indirect support is zero. A cause
  // visitor should never have to infer whether the displayed number is direct or derived.
  return `${support.direct} direct signer${support.direct === 1 ? '' : 's'}, ${support.indirect} indirect supporter${support.indirect === 1 ? '' : 's'} · ${support.total} total`
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
  const tooShort = plank.text.trim().length > 0 && plank.text.trim().length < MIN_PLANK_LENGTH
  const blocked = Boolean(plank.safety && !plank.safety.allowed)
  const draftBusy = mutationLocked || publishing || reviewing
  const example = review?.exampleWording?.trim()
  const exampleDiffers = Boolean(example && example !== plank.text.trim())

  return (
    <Paper
      variant="outlined"
      sx={{ p: 1.75, borderRadius: 2 }}
      data-testid={published ? 'plank-row-published' : 'plank-row-draft'}
    >
      <Stack direction="row" spacing={1} alignItems="flex-start">
        {published ? (
          <Checkbox
            size="small"
            checked={selected}
            onChange={(event) => onSelectedChange(event.target.checked)}
            sx={{ mt: -0.5 }}
            slotProps={{ input: { 'aria-label': `Include issue ${index + 1} in the counts above` } }}
          />
        ) : (
          // Keeps draft rows aligned with published ones without implying they
          // can be counted — nothing is countable until it is on chain.
          <Box sx={{ width: 34, flexShrink: 0 }} />
        )}

        <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
          {published ? (
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>{plank.text}</Typography>
            </Box>
          ) : (
            <TextField
              value={plank.text}
              onChange={(event) => onTextChange(event.target.value)}
              multiline
              minRows={2}
              fullWidth
              size="small"
              disabled={draftBusy}
              placeholder="One issue a supporter could sincerely sign, on its own."
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
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={support ? support.total.toLocaleString() : supportLoading ? '…' : '—'}
                sx={{ minWidth: 44 }}
              />
              <Typography variant="caption" color="text.secondary">
                {supportSummary(support, supportLoading)}
              </Typography>
              {addedLaterLabel && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={addedLaterLabel}
                  data-testid={`plank-added-later-${index}`}
                  sx={{ borderStyle: 'dashed' }}
                />
              )}
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

          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
            {published ? (
              <>
                <SupportButton
                  statementCid={plank.cid as IpfsCidV1}
                  onSupported={onSupported}
                  subject="issue"
                />
                <Button component={RouterLink} to={`/statement/${plank.cid}`} size="small" sx={{ textTransform: 'none' }}>
                  View statement
                </Button>
                <Button component={RouterLink} to={`/statement/${plank.cid}/board`} size="small" sx={{ textTransform: 'none' }}>
                  {projectCount > 0
                    ? `${projectCount} aligned project${projectCount === 1 ? '' : 's'}`
                    : 'Aligned projects'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="contained"
                  size="small"
                  onClick={onPublish}
                  disabled={draftBusy || tooShort || plank.text.trim().length === 0}
                  sx={{ textTransform: 'none' }}
                  data-testid={`plank-publish-${index}`}
                >
                  {publishing ? 'Publishing…' : 'Publish issue'}
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
              </>
            )}
          </Stack>
        </Stack>

        {!published && (
          <Tooltip title="Remove issue">
            <span>
              <IconButton
                size="small"
                onClick={onDelete}
                disabled={draftBusy}
                aria-label={`Remove issue ${index + 1}`}
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
