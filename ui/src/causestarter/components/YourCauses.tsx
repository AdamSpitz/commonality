import type { ReactNode } from 'react'
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { CauseCard } from './CauseCard'
import { HeaderInfoTip } from './HeaderInfoTip'
import { createCausePath, isLive, type CauseDraft } from '../lib/causeStore'

export function YourCauses({
  causes,
  loading,
  footer,
  testId,
  headingComponent = 'h1',
}: {
  causes: CauseDraft[]
  loading: boolean
  footer?: ReactNode
  testId?: string
  headingComponent?: 'h1' | 'h2'
}) {
  const navigate = useNavigate()
  // "Live" is derived, not a status flag: a cause is live once any of its
  // planks is on chain, and it can gain more planks at any time.
  const drafts = causes.filter((cause) => !isLive(cause))
  const launched = causes.filter(isLive)

  return (
    <Stack spacing={3} data-testid={testId}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" component={headingComponent} sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
            Cause boards
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0, mt: 0.35 }}>
          <Button
            variant="outlined"
            data-testid="causes-start-cause"
            sx={{
              minHeight: 40,
              px: 1.75,
              borderRadius: 999,
              textTransform: 'none',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
            onClick={() => navigate(createCausePath())}
          >
            Start a cause board
          </Button>
        </Stack>
      </Box>

      {loading && causes.length === 0 && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Loading cause boards…
          </Typography>
        </Stack>
      )}

      {!loading && causes.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No cause boards on this device. Start one if you want a different combination of
          statements — reuse overlapping ones so you are not starting from zero. Or open
          a cause board from its organizer’s link; there is no directory.
        </Alert>
      )}

      {launched.length > 0 && (
        <Box>
          <Stack direction="row" alignItems="center" sx={{ mb: 1.25 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Bookmarked cause boards
            </Typography>
            <HeaderInfoTip
              title="Published bookmarks follow your wallet and are public."
              label="About bookmarked cause boards"
            />
          </Stack>
          <Stack spacing={1.5}>
            {launched.map((cause) => (
              <CauseCard key={cause.id} cause={cause} />
            ))}
          </Stack>
        </Box>
      )}

      {drafts.length > 0 && (
        <Box>
          <Stack direction="row" alignItems="center" sx={{ mb: 1.25 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Cause board drafts
            </Typography>
            <HeaderInfoTip
              title="Drafts stay on this device."
              label="About cause board drafts"
            />
          </Stack>
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
