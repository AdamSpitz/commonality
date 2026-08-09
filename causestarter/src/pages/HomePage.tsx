import { Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { MomentumSteps } from '../components/MomentumSteps'
import { CauseCard } from '../components/CauseCard'
import { useUserCauses } from '../hooks/useUserCauses'

export function HomePage() {
  const { causes: allCauses, loading } = useUserCauses()
  const causes = allCauses.slice(0, 2)

  return (
    <Stack spacing={3}>
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
          Start from the goal you want to accomplish, add short statements people can stand behind,
          then grow support with funding and media tools when you need them.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 3 }}>
          <Button
            component={RouterLink}
            to="/start"
            variant="contained"
            size="large"
            data-testid="home-start-cause"
            sx={{ minHeight: 48, borderRadius: 999, fontWeight: 700, textTransform: 'none', px: 3 }}
          >
            Start a cause
          </Button>
          <Button
            component={RouterLink}
            to="/discover"
            variant="outlined"
            size="large"
            data-testid="home-support-cause"
            sx={{ minHeight: 48, borderRadius: 999, fontWeight: 600, textTransform: 'none', px: 3 }}
          >
            Support a cause
          </Button>
        </Stack>
      </Paper>

      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
          How it works
        </Typography>
        <MomentumSteps />
      </Box>

      {(loading || causes.length > 0) && (
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Your causes
            </Typography>
            <Button component={RouterLink} to="/momentum" size="small" sx={{ textTransform: 'none' }}>
              See all
            </Button>
          </Stack>
          {loading && causes.length === 0 ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                Loading causes you support…
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              {causes.map((cause) => (
                <CauseCard key={cause.id} cause={cause} />
              ))}
            </Stack>
          )}
        </Box>
      )}

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
          Need a specific tool?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          Signing, funding, media support, and worked examples live under Tools. Open them when
          your cause needs that next step — keep CauseStarter as home base.
        </Typography>
        <Button
          component={RouterLink}
          to="/tools"
          sx={{ mt: 1.5, textTransform: 'none', fontWeight: 600 }}
        >
          Browse tools
        </Button>
      </Paper>
    </Stack>
  )
}
