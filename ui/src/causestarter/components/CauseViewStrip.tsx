import { Box, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import type { ViewCounts } from '@commonality/sdk/conceptspace'

interface CauseViewStripProps {
  counts: ViewCounts | undefined
  selectedCount: number
  loading: boolean
  /**
   * Direct signatures on the least-signed selected plank, or `undefined` when
   * that cannot be stated exactly. See {@link CauseViewStrip} for why band 2 is
   * not shown without it.
   */
  fewestDirectSignatures: number | undefined
}

function userWord(count: number): string {
  return count === 1 ? 'user signed' : 'users signed'
}

/**
 * Both set counts over the checked planks, shown together.
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
  counts,
  selectedCount,
  loading,
  fewestDirectSignatures,
}: CauseViewStripProps) {
  // Band 2 restates the same people as "signed all" when there is only one plank.
  const showConjunctionExtra = selectedCount > 1

  return (
    <Paper
      variant="outlined"
      data-testid="cause-view-strip"
      sx={{ p: 2, borderRadius: 2 }}
    >
      <Stack spacing={1.25}>
        {loading && !counts && (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">Counting signers…</Typography>
          </Stack>
        )}

        {!loading && selectedCount === 0 && (
          <Typography variant="body2" color="text.secondary">
            Select at least one statement to see who signed it.
          </Typography>
        )}

        {counts && selectedCount > 0 && (
          <Stack spacing={1.25}>
            <Box>
              <Typography variant="body1">
                <Box component="span" sx={{ fontWeight: 800 }} data-testid="view-count-any">
                  {counts.union.total.toLocaleString()}
                </Box>
                {' '}
                {userWord(counts.union.total)} at least one selected statement.
              </Typography>
              {counts.union.direct < counts.union.total && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {counts.union.direct.toLocaleString()} signed a statement directly; the rest signed
                  something that implies one.
                </Typography>
              )}
            </Box>

            <Box>
              <Typography variant="body1">
                <Box component="span" sx={{ fontWeight: 800 }} data-testid="view-count-all">
                  {counts.conjunction.signedAll.toLocaleString()}
                </Box>
                {' '}
                {userWord(counts.conjunction.signedAll)} every selected statement.
              </Typography>
            </Box>

            {showConjunctionExtra && fewestDirectSignatures !== undefined && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }} data-testid="view-count-none-disagreed">
                  {counts.conjunction.noneDisagreed.toLocaleString()} more
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  signed at least one and have disagreed with none — they were never asked about the
                  rest.
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.75 }}
                  data-testid="view-fewest-signatures"
                >
                  Fewest signatures on any single statement:{' '}
                  <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {fewestDirectSignatures.toLocaleString()}
                  </Box>
                  . A statement added later starts here, however large the number above is.
                </Typography>
              </Box>
            )}
          </Stack>
        )}
      </Stack>
    </Paper>
  )
}
