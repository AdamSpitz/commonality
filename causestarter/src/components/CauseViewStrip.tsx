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
  /**
   * Direct signatures on the least-signed selected plank, or `undefined` when
   * that cannot be stated exactly. See {@link CauseViewStrip} for why band 2 is
   * not shown without it.
   */
  fewestDirectSignatures: number | undefined
}

/**
 * The two views over the selected planks.
 *
 * Neither number is a signature on a combination — nobody signed "all five" —
 * so each is labeled for exactly what it counts. The conjunction shows two
 * bands because a bare intersection collapses on silence rather than on
 * disagreement: `noOpinion` is the default, so someone who signed four planks
 * and never saw the fifth would vanish from a one-band number.
 *
 * Band 2 is never shown alone, because on its own it rewards roster churn. The
 * organizer owns which planks appear here and may change them; adding one can
 * only *raise* band 2, since a plank nobody has encountered yet contributes
 * silence and silence is what band 2 counts as assent. So it is paired with the
 * weakest link, which moves the other way — adding a plank can only lower the
 * fewest-signed count — and the pair cannot be inflated by editing the roster.
 *
 * The weakest link counts **direct** signatures only, unlike band 2 itself. An
 * implication arrow into a freshly added plank would lift its indirect support
 * to match its neighbours' and re-hide precisely the case this line exists to
 * expose — and on a cause page the organizer may well be the attester who drew
 * that arrow.
 */
export function CauseViewStrip({
  mode,
  onModeChange,
  counts,
  selectedCount,
  publishedCount,
  loading,
  fewestDirectSignatures,
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
      variant="outlined"
      data-testid="cause-view-strip"
      sx={{ p: 2, borderRadius: 2 }}
    >
      <Stack spacing={1.75}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Supporters across the checked issues
        </Typography>
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
            {!singular && fewestDirectSignatures !== undefined && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }} data-testid="view-count-none-disagreed">
                  {counts.conjunction.noneDisagreed.toLocaleString()} more
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  support at least one and have disagreed with none — they were never asked about the
                  rest.
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.75 }}
                  data-testid="view-fewest-signatures"
                >
                  Fewest signatures on any single issue:{' '}
                  <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {fewestDirectSignatures.toLocaleString()}
                  </Box>
                  . An issue added later starts here, however large the number above is.
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
