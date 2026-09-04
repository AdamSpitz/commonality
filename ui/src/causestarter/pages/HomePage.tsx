import { Box, CircularProgress, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { YourCauses } from '../components/YourCauses'
import { YourDashboard } from '../components/YourDashboard'
import { YourNudgersAndNudges } from '../components/YourNudgersAndNudges'
import { YourProjects } from '../components/YourProjects'
import { YourSignedStatements } from '../components/YourSignedStatements'
import { useUserCauses } from '../hooks/useUserCauses'
import { WelcomePage } from './WelcomePage'

function WorkspaceLabel({
  job,
  to,
}: {
  job: string
  to: string
}) {
  return (
    <Typography
      component={RouterLink}
      to={to}
      variant="overline"
      sx={{
        letterSpacing: '0.14em',
        fontWeight: 700,
        color: 'primary.main',
        textDecoration: 'none',
        display: 'inline-block',
        mb: 0.5,
      }}
    >
      {job}
    </Typography>
  )
}

export function HomePage() {
  const { causes, loading } = useUserCauses()
  const { isConnected } = useAccount()
  const occupied = causes.length > 0 || isConnected

  if (occupied) {
    return (
      <Stack spacing={4} data-testid="home-dashboard">
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
            Your work
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 560 }}>
            Sign, fund, and organize from here. Each section opens that job — it does
            not try to do every job on this page.
          </Typography>
        </Box>

        <Box data-testid="home-inbox-fund">
          <WorkspaceLabel job="Fund" to="/dashboard" />
          <YourDashboard />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 4,
            alignItems: 'start',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) minmax(0, 1fr)' },
          }}
        >
          <Stack spacing={4} data-testid="home-inbox-sign">
            <Box>
              <WorkspaceLabel job="Sign" to="/statements" />
              <YourSignedStatements />
            </Box>
            <YourNudgersAndNudges />
          </Stack>
          <Stack spacing={4} data-testid="home-inbox-organize">
            <Box data-testid="home-dashboard-causes">
              <WorkspaceLabel job="Organize" to="/causes" />
              <YourCauses
                causes={causes}
                loading={loading}
                compact
                headingComponent="h2"
              />
            </Box>
            <YourProjects compact />
          </Stack>
        </Box>
      </Stack>
    )
  }

  if (loading) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 3 }} data-testid="home-loading">
        <CircularProgress size={18} />
        <Typography variant="body2" color="text.secondary">
          Loading cause boards…
        </Typography>
      </Stack>
    )
  }

  return <WelcomePage />
}
