import { Box, Chip, CircularProgress, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import type { ViewCounts } from '@commonality/sdk/conceptspace'

export type ViewMode = 'any' | 'all'

interface CauseViewStripProps {
  mode: ViewMode
  onModeChange: (mode: ViewMode) => void
  counts: ViewCounts | undefined
  selectedCount: number
  publishedCount: number
  loading: boolean
}

/**
 * The two views over the selected planks.
 *
 * Neither number is a signature on a combination — nobody signed "all five" —
 * so each is labeled for exactly what it counts. The conjunction shows two
 * bands because a bare intersection collapses on silence rather than on
 * disagreement: `noOpinion` is the default, so someone who signed four planks
 * and never saw the fifth would vanish from a one-band number.
 */
export function CauseViewStrip({
  mode,
  onModeChange,
  counts,
  selectedCount,
  publishedCount,
  loading,
}: CauseViewStripProps) {
  const allSelected = selectedCount === publishedCount
  const scope = allSelected
    ? `these ${publishedCount} issues`
    : `the ${selectedCount} selected issues`
  // "at least one of this 1 issue" reads badly; with a single plank there is no
  // combination to describe, so the counts are just that issue's.
  const singular = selectedCount === 1

  return (
    <Paper
      elevation={0}
      data-testid="cause-view-strip"
      sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
    >
      <Stack spacing={1.75}>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={mode}
          onChange={(_, next: ViewMode | null) => next && onModeChange(next)}
          aria-label="How to count supporters across issues"
        >
          <ToggleButton value="any" data-testid="view-mode-any">Supports any</ToggleButton>
          <ToggleButton value="all" data-testid="view-mode-all">Supports all</ToggleButton>
        </ToggleButtonGroup>

        {loading && !counts && (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">Counting supporters…</Typography>
          </Stack>
        )}

        {!loading && selectedCount === 0 && (
          <Typography variant="body2" color="text.secondary">
            Select at least one issue to see who supports it.
          </Typography>
        )}

        {counts && mode === 'any' && (
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }} data-testid="view-count-any">
              {counts.union.total.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {counts.union.total === 1 ? 'person supports' : 'people support'}{' '}
              {singular ? 'this issue' : `at least one of ${scope}`}.
            </Typography>
            {counts.union.direct < counts.union.total && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {counts.union.direct.toLocaleString()} signed an issue directly; the rest signed
                something that implies one.
              </Typography>
            )}
          </Box>
        )}

        {counts && mode === 'all' && (
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }} data-testid="view-count-all">
                {counts.conjunction.signedAll.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {counts.conjunction.signedAll === 1 ? 'person has' : 'people have'} signed{' '}
                {singular ? 'this issue' : `every one of ${scope}`}.
              </Typography>
            </Box>
            {!singular && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }} data-testid="view-count-none-disagreed">
                  {counts.conjunction.noneDisagreed.toLocaleString()} more
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  support at least one and have disagreed with none — they were never asked about the
                  rest.
                </Typography>
              </Box>
            )}
          </Stack>
        )}

        <Chip
          size="small"
          variant="outlined"
          label="Counted from signatures on individual issues — nobody signs the combination"
          sx={{ alignSelf: 'flex-start', height: 'auto', py: 0.5, '& .MuiChip-label': { whiteSpace: 'normal' } }}
        />
      </Stack>
    </Paper>
  )
}
