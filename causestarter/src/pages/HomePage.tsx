import { Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { HowItWorksSteps } from '../components/HowItWorksSteps'
import { YourCauses } from '../components/YourCauses'
import { useUserCauses } from '../hooks/useUserCauses'
import { createCausePath } from '../lib/causeStore'

function LandingHome() {
  const navigate = useNavigate()

  return (
    <Stack spacing={3} data-testid="home-landing">
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          background: (theme) =>
            theme.palette.mode === 'light'
              ? 'linear-gradient(160deg, rgba(15,118,110,0.10) 0%, rgba(255,252,247,0.95) 55%, #fff 100%)'
              : 'linear-gradient(160deg, rgba(45,212,191,0.14) 0%, rgba(15,23,42,0.9) 60%, #0b1220 100%)',
        }}
      >
        <Typography variant="overline" sx={{ letterSpacing: '0.14em', fontWeight: 700, color: 'primary.main' }}>
          CauseStarter
        </Typography>
        <Typography
          variant="h3"
          component="h1"
          sx={{
            mt: 0.5,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            fontSize: { xs: '1.85rem', sm: '2.35rem' },
            lineHeight: 1.15,
          }}
        >
          Start a cause. Build a Movement. Change the world.
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5, maxWidth: 520 }}>
          Write clear issues people can support one at a time, then grow support with funding
          and media tools when you need them.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 3 }}>
          <Button
            variant="contained"
            size="large"
            data-testid="home-start-cause"
            onClick={() => navigate(createCausePath())}
            sx={{ minHeight: 48, borderRadius: 999, fontWeight: 700, textTransform: 'none', px: 3 }}
          >
            Start a cause
          </Button>
          {/* There is deliberately no "support a cause" counterpart: we list no
              causes and rank none. You reach a cause through its organizer's own
              link. */}
        </Stack>
      </Paper>

      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
          How it works
        </Typography>
        <HowItWorksSteps />
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Examples and background
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          Worked example causes and optional reading live under Docs. Funding and growth
          tools stay on each cause page.
        </Typography>
        <Button
          component={RouterLink}
          to="/docs"
          sx={{ mt: 1.5, textTransform: 'none', fontWeight: 600 }}
        >
          Browse docs
        </Button>
      </Paper>
    </Stack>
  )
}

export function HomePage() {
  const { causes, loading } = useUserCauses()

  if (causes.length > 0) {
    return (
      <YourCauses
        causes={causes}
        loading={loading}
        testId="home-dashboard"
        footer={
          <Button
            component={RouterLink}
            to="/docs"
            sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 600, px: 0 }}
          >
            How it works and examples
          </Button>
        }
      />
    )
  }

  if (loading) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 3 }} data-testid="home-loading">
        <CircularProgress size={18} />
        <Typography variant="body2" color="text.secondary">
          Loading on-chain support…
        </Typography>
      </Stack>
    )
  }

  return <LandingHome />
}
