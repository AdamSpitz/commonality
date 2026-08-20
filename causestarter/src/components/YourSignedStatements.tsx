import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { ConnectWalletHint } from './ConnectWalletHint'
import { HeaderInfoTip } from './HeaderInfoTip'
import { useUserStatements } from '../hooks/useUserStatements'

const sectionHeadingSx = { fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' } }

export function YourSignedStatements() {
  const { statements, loading, connected, error, refresh } = useUserStatements()
  const count = statements.length

  return (
    <Stack spacing={1.5} data-testid="home-statements">
      <Stack direction="row" alignItems="center">
        <Typography variant="h4" component="h2" sx={sectionHeadingSx}>
          Statements
        </Typography>
        <HeaderInfoTip
          title="These are statements this wallet has signed. Bookmarks without signing are not listed yet."
          label="About signed statements"
        />
      </Stack>

      {!connected && (
        <Box sx={{ mt: 1.5 }}>
          <ConnectWalletHint>Connect a wallet to see statements you have signed.</ConnectWalletHint>
        </Box>
      )}

      {connected && loading && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Loading signed statements…
          </Typography>
        </Stack>
      )}

      {connected && !loading && error && (
        <Alert severity="error" sx={{ borderRadius: 2, mt: 1 }} data-testid="home-statements-error">
          {error}
          <Button onClick={refresh} sx={{ display: 'block', mt: 0.5, textTransform: 'none', px: 0 }}>
            Try again
          </Button>
        </Alert>
      )}

      {connected && !loading && !error && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }} data-testid="home-statements-count">
            {count === 1 ? '1 signed statement' : `${count} signed statements`}
          </Typography>
          <Button
            component={RouterLink}
            to="/statements"
            data-testid="home-statements-link"
            sx={{ mt: 1, textTransform: 'none', fontWeight: 600, px: 0 }}
          >
            View signed statements
          </Button>
        </>
      )}
    </Stack>
  )
}
