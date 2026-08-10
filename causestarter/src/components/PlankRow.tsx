import {
  Box, Button, Checkbox, Chip, CircularProgress, IconButton, Paper, Stack,
  TextField, Tooltip, Typography,
} from '@mui/material'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { Link as RouterLink } from 'react-router-dom'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { SupportButton, type SupportSettledInfo } from './SupportButton'
import type { CausePlank } from '../lib/causeStore'

/** Below this, a plank is too vague for the attester to draw an arrow either way. */
export const MIN_PLANK_LENGTH = 12

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
  onSharpen: () => void
  onPublish: () => void
  sharpening: boolean
  publishing: boolean
  /** Another cause mutation is in flight, so all draft controls are locked. */
  mutationLocked?: boolean
}

function supportSummary(support: PlankSupport | undefined, loading: boolean): string {
  if (!support) return loading ? 'Counting supporters…' : 'Supporters unavailable'
  if (support.indirect === 0) {
    return `${support.direct} signed this`
  }
  // Direct and indirect overlap, so `total` is a union — never direct + indirect.
  return `${support.direct} signed this; ${support.total} support it counting statements that imply it`
}

export function PlankRow({
  plank, index, selected, onSelectedChange, support, supportLoading, projectCount,
  onSupported, onTextChange, onDelete, onSharpen, onPublish, sharpening, publishing,
  mutationLocked = false,
}: PlankRowProps) {
  const published = Boolean(plank.cid)
  const tooShort = plank.text.trim().length > 0 && plank.text.trim().length < MIN_PLANK_LENGTH
  const blocked = Boolean(plank.safety && !plank.safety.allowed)
  const draftBusy = mutationLocked || publishing || sharpening

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
            <Typography variant="body1" sx={{ fontWeight: 500 }}>{plank.text}</Typography>
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
                    : plank.rationale || 'Keep this specific, self-contained, and natural to sign.'
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
            </Stack>
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
                  startIcon={sharpening ? <CircularProgress size={14} /> : <AutoFixHighIcon fontSize="small" />}
                  onClick={onSharpen}
                  disabled={draftBusy || plank.text.trim().length === 0}
                  sx={{ textTransform: 'none' }}
                >
                  {sharpening ? 'Sharpening…' : 'Help make this attestable'}
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

      {published && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, pl: 4.5 }}>
          Published — people sign this exact wording, so it can no longer be edited.
        </Typography>
      )}
    </Paper>
  )
}
