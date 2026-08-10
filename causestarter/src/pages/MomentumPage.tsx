import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { CauseCard } from '../components/CauseCard'
import { useUserCauses } from '../hooks/useUserCauses'
import { isLive } from '../lib/causeStore'

export function MomentumPage() {
  const { causes, loading } = useUserCauses()
  // "Live" is derived, not a status flag: a cause is live once any of its
  // planks is on chain, and it can gain more planks at any time.
  const drafts = causes.filter((cause) => !isLive(cause))
  const launched = causes.filter(isLive)

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
          Momentum
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          Causes you are building on this device, plus causes whose main statement you have
          publicly supported on-chain.
        </Typography>
      </Box>

      {loading && causes.length === 0 && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Loading on-chain support…
          </Typography>
        </Stack>
      )}

      {!loading && causes.length === 0 && (
        <Alert
          severity="info"
          sx={{ borderRadius: 2 }}
          action={
            <Button component={RouterLink} to="/start" color="inherit" size="small" sx={{ textTransform: 'none' }}>
              Start
            </Button>
          }
        >
          No causes yet. Start one to begin building momentum, or support a public cause from Discover.
        </Alert>
      )}

      {launched.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.25 }}>
            Live causes
          </Typography>
          <Stack spacing={1.5}>
            {launched.map((cause) => (
              <CauseCard key={cause.id} cause={cause} />
            ))}
          </Stack>
        </Box>
      )}

      {drafts.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.25 }}>
            Drafts
          </Typography>
          <Stack spacing={1.5}>
            {drafts.map((cause) => (
              <CauseCard key={cause.id} cause={cause} />
            ))}
          </Stack>
        </Box>
      )}

      <Button
        component={RouterLink}
        to="/start"
        variant="contained"
        size="large"
        fullWidth
        sx={{ minHeight: 48, borderRadius: 999, textTransform: 'none', fontWeight: 700 }}
      >
        Start another cause
      </Button>
    </Stack>
  )
}
