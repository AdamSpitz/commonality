import { Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { ConceptMap } from '../components/ConceptMap'
import { CauseCard } from '../components/CauseCard'
import { createCausePath, listCauses } from '../lib/causeModel'

export function HomePage() {
  const navigate = useNavigate()
  const causes = listCauses().slice(0, 3)

  return (
    <Stack spacing={3} data-testid="home-page">
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
          ui3 · from Issue #116
        </Typography>
        <Typography
          variant="h3"
          component="h1"
          sx={{
            mt: 0.5,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            fontSize: { xs: '1.75rem', sm: '2.2rem' },
            lineHeight: 1.15,
          }}
        >
          Launch a Cause. Build Momentum. Change the World
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5, maxWidth: 520 }}>
          Name a cause, set one clear goal, share the beliefs that motivate it, plan milestones with
          measures, and grow projects people can stand by, join, or fund.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 3 }}>
          <Button
            variant="contained"
            size="large"
            data-testid="home-start-cause"
            onClick={() => navigate(createCausePath())}
            sx={{ minHeight: 48, borderRadius: 999, fontWeight: 700, textTransform: 'none', px: 3 }}
          >
            Launch a cause
          </Button>
          <Button
            component={RouterLink}
            to="/tools"
            size="large"
            variant="outlined"
            sx={{ minHeight: 48, borderRadius: 999, fontWeight: 600, textTransform: 'none', px: 3 }}
          >
            Online tools
          </Button>
        </Stack>
      </Paper>

      <Stack spacing={1.25}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          How the pieces fit
        </Typography>
        <ConceptMap />
      </Stack>

      {causes.length > 0 && (
        <Stack spacing={1.25}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Your causes
            </Typography>
            <Button component={RouterLink} to="/causes" size="small" sx={{ textTransform: 'none' }}>
              See all
            </Button>
          </Stack>
          {causes.map((cause) => (
            <CauseCard key={cause.id} cause={cause} />
          ))}
        </Stack>
      )}

      <Paper
        elevation={0}
        sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Members &amp; profiles
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          Your member page shows statements you support, causes you founded, projects you care about,
          and who you delegate to.
        </Typography>
        <Button
          component={RouterLink}
          to="/member"
          sx={{ mt: 1.5, textTransform: 'none', fontWeight: 600 }}
        >
          Open your profile
        </Button>
      </Paper>
    </Stack>
  )
}
