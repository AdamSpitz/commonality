import { Box, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { formatUnits } from 'viem'
import { ConnectWalletHint } from './ConnectWalletHint'
import { useCauseMonthlyPledges } from '../hooks/useCauseMonthlyPledges'

function formatMonthly(amount: bigint, decimals: number, symbol: string): string {
  return `${formatUnits(amount, decimals)} ${symbol}/month`
}

export function CauseFundingSummary({
  statementCids,
  href,
}: {
  statementCids: string[]
  href: string
}) {
  const { loading, available, symbol, decimals, connected, totalMonthly, personalMonthly } =
    useCauseMonthlyPledges(statementCids)

  if (statementCids.length === 0) return null

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'border-color 0.15s',
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      <Box
        component={RouterLink}
        to={href}
        data-testid="cause-funding-summary"
        sx={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Pledges
        </Typography>
        {available && loading ? (
          <Box sx={{ py: 1 }}>
            <CircularProgress size={20} aria-label="Loading pledges" />
          </Box>
        ) : (
          <Stack spacing={0.25} sx={{ mt: 0.75 }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {available ? formatMonthly(totalMonthly, decimals, symbol) : `0 ${symbol}/month`} pledged
            </Typography>
            {connected && (
              <Typography variant="body2" color="text.secondary">
                You: {available ? formatMonthly(personalMonthly, decimals, symbol) : `0 ${symbol}/month`}
              </Typography>
            )}
          </Stack>
        )}
      </Box>
      {!connected && (
        <Box sx={{ mt: 1.25 }}>
          <ConnectWalletHint>
            Connect a wallet to see your pledge.
          </ConnectWalletHint>
        </Box>
      )}
    </Paper>
  )
}
