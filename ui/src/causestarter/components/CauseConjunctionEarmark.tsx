import { Alert, Button, Stack, Typography } from '@mui/material'

interface CauseConjunctionEarmarkProps {
  selectedCount: number
  walletReady: boolean
  creating: boolean
  error: string | null
  onEarmark: () => void
}

/**
 * Earmark a bundle by targeting the conjunctive combinator.
 *
 * Signing "A and B" is the honest encoding of "this money may further either
 * statement": the funder endorses both, so a delegate may spend on work that
 * furthers any conjunct. The `any` combinator is a weaker identity node, not
 * this money job.
 */
export function CauseConjunctionEarmark({
  selectedCount,
  walletReady,
  creating,
  error,
  onEarmark,
}: CauseConjunctionEarmarkProps) {
  return (
    <Stack spacing={1} data-testid="conjunction-earmark">
      <Typography variant="body2" color="text.secondary">
        Select two or more statements you all endorse. Earmarking the combination
        means the funds may further any of them — we publish an explicit “all of
        these” statement if it does not already exist, then open the pledge form
        against that statement.
      </Typography>
      {selectedCount < 2 ? (
        <Typography variant="caption" color="text.secondary">
          Check at least two statements to earmark a combination.
        </Typography>
      ) : (
        <Button
          variant="contained"
          size="small"
          disabled={creating}
          data-testid="earmark-conjunction"
          onClick={onEarmark}
          sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
        >
          {creating
            ? 'Preparing combination…'
            : walletReady
              ? `Earmark for all ${selectedCount} selected`
              : 'Connect a wallet to earmark this combination'}
        </Button>
      )}
      {error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
      )}
    </Stack>
  )
}
