import { Alert, Box, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { ConnectWalletHint } from '../components/ConnectWalletHint'
import { HeaderInfoTip } from '../components/HeaderInfoTip'
import { useUserStatements } from '../hooks/useUserStatements'

export function StatementsPage() {
  const { statements, loading, connected } = useUserStatements()

  return (
    <Stack spacing={3} data-testid="statements-page">
      <Box>
        <Stack direction="row" alignItems="center">
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
            Signed statements
          </Typography>
          <HeaderInfoTip
            title="Direct signatures from this wallet. Retracting a signature removes the statement from this list once the indexer catches up."
            label="About this list"
          />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 560 }}>
          These are statements you have signed. They are not ranked here; this is
          just the list for this wallet.
        </Typography>
      </Box>

      {!connected && (
        <ConnectWalletHint>Connect a wallet to see statements you have signed.</ConnectWalletHint>
      )}

      {connected && loading && statements.length === 0 && (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Loading signed statements…
          </Typography>
        </Stack>
      )}

      {connected && !loading && statements.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No signed statements yet. Open a statement and sign it to add it here.
        </Alert>
      )}

      {statements.map((statement) => (
        <Paper
          key={statement.cid}
          elevation={0}
          data-testid="signed-statement"
          sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
        >
          <Typography
            component={RouterLink}
            to={`/statement/${statement.cid}`}
            variant="subtitle1"
            sx={{ fontWeight: 700, color: 'inherit', textDecoration: 'none' }}
          >
            {statement.title?.trim() || 'Untitled statement'}
          </Typography>
          {statement.excerpt && statement.excerpt.trim() !== statement.title?.trim() && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {statement.excerpt}
            </Typography>
          )}
        </Paper>
      ))}
    </Stack>
  )
}
