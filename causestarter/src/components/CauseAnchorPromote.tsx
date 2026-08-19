import { Alert, Button, Stack, Typography } from '@mui/material'
import type { CombinatorKind } from '@commonality/sdk/displayable-documents'
import { findAnchor, type CauseAnchor } from '../lib/causeStore'

interface CauseAnchorPromoteProps {
  /** The published statements currently selected on the cause page. */
  selectedCids: readonly string[]
  canPromote: boolean
  promoting: CombinatorKind | null
  error: string | null
  anchors: CauseAnchor[] | undefined
  onPromote: (kind: CombinatorKind) => void
}

export function CauseAnchorPromote({
  selectedCids,
  canPromote,
  promoting,
  error,
  anchors,
  onPromote,
}: CauseAnchorPromoteProps) {
  if (selectedCids.length < 2) return null

  // Only an anchor minted from *this* selection describes it. A promotion over a
  // different set is a different statement (ADR 0010), so showing it here would
  // claim the old alliance had been updated to match.
  const anyAnchor = findAnchor(anchors, 'any', selectedCids)
  const allAnchor = findAnchor(anchors, 'all', selectedCids)

  return (
    <Stack spacing={1} sx={{ mt: 1.5 }} data-testid="cause-anchor-promote">
      <Typography variant="body2" color="text.secondary">
        Promote this selection to a graph node other surfaces can sign, earmark to, or imply.
        The combination has no founder title — display names stay on this cause page.
      </Typography>
      {canPromote && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button
            variant="outlined"
            size="small"
            disabled={promoting !== null || Boolean(anyAnchor)}
            data-testid="promote-any"
            onClick={() => onPromote('any')}
          >
            {promoting === 'any' ? 'Publishing…' : 'Promote as any of these'}
          </Button>
          <Button
            variant="outlined"
            size="small"
            disabled={promoting !== null || Boolean(allAnchor)}
            data-testid="promote-all"
            onClick={() => onPromote('all')}
          >
            {promoting === 'all' ? 'Publishing…' : 'Promote as all of these'}
          </Button>
        </Stack>
      )}
      {anyAnchor && (
        <Typography variant="caption" color="text.secondary" data-testid="anchor-cid-any">
          Alliance (any): {anyAnchor.cid}
        </Typography>
      )}
      {allAnchor && (
        <Typography variant="caption" color="text.secondary" data-testid="anchor-cid-all">
          Manifesto (all): {allAnchor.cid}
        </Typography>
      )}
      {error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
      )}
    </Stack>
  )
}
