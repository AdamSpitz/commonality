import type { ReactNode } from 'react'
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { CauseCard } from './CauseCard'
import { createCausePath, isLive, type CauseDraft } from '../lib/causeStore'

export function YourCauses({
  causes,
  loading,
  footer,
  testId,
}: {
  causes: CauseDraft[]
  loading: boolean
  footer?: ReactNode
  testId?: string
}) {
  const navigate = useNavigate()
  // "Live" is derived, not a status flag: a cause is live once any of its
  // planks is on chain, and it can gain more planks at any time.
  const drafts = causes.filter((cause) => !isLive(cause))
  const launched = causes.filter(isLive)

  return (
    <Stack spacing={3} data-testid={testId}>
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
          Causes
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          Causes you have bookmarked on this device, plus causes whose issues you have
          publicly signed on-chain.
        </Typography>
      </Box>

      <Button
        variant="contained"
        size="large"
        fullWidth
        data-testid="causes-start-cause"
        sx={{ minHeight: 48, borderRadius: 999, textTransform: 'none', fontWeight: 700 }}
        onClick={() => navigate(createCausePath())}
      >
        Start a cause
      </Button>

      {loading && causes.length === 0 && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Loading on-chain support…
          </Typography>
        </Stack>
      )}

      {!loading && causes.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No causes yet on this device. Start one, or open a cause from its organizer’s link.
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

      {footer}
    </Stack>
  )
}
