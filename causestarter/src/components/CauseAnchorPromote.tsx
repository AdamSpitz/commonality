import { Alert, Button, Stack, Typography } from '@mui/material'
import type { CombinatorKind } from '@commonality/sdk/displayable-documents'
import type { CauseAnchorCids } from '../lib/causeStore'

interface CauseAnchorPromoteProps {
  selectedCount: number
  canPromote: boolean
  promoting: CombinatorKind | null
  error: string | null
  anchors: CauseAnchorCids | undefined
  onPromote: (kind: CombinatorKind) => void
}

export function CauseAnchorPromote({
  selectedCount,
  canPromote,
  promoting,
  error,
  anchors,
  onPromote,
}: CauseAnchorPromoteProps) {
  if (selectedCount < 2) return null

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
            disabled={promoting !== null}
            data-testid="promote-any"
            onClick={() => onPromote('any')}
          >
            {promoting === 'any' ? 'Publishing…' : 'Promote as any of these'}
          </Button>
          <Button
            variant="outlined"
            size="small"
            disabled={promoting !== null}
            data-testid="promote-all"
            onClick={() => onPromote('all')}
          >
            {promoting === 'all' ? 'Publishing…' : 'Promote as all of these'}
          </Button>
        </Stack>
      )}
      {anchors?.any && (
        <Typography variant="caption" color="text.secondary" data-testid="anchor-cid-any">
          Alliance (any): {anchors.any}
        </Typography>
      )}
      {anchors?.all && (
        <Typography variant="caption" color="text.secondary" data-testid="anchor-cid-all">
          Manifesto (all): {anchors.all}
        </Typography>
      )}
      {error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
      )}
    </Stack>
  )
}
