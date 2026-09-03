import { CircularProgress, Stack, Typography } from '@mui/material'
import { useAccount } from 'wagmi'
import { YourCauses } from '../components/YourCauses'
import { YourDashboard } from '../components/YourDashboard'
import { YourNudgersAndNudges } from '../components/YourNudgersAndNudges'
import { YourProjects } from '../components/YourProjects'
import { YourSignedStatements } from '../components/YourSignedStatements'
import { useUserCauses } from '../hooks/useUserCauses'
import { WelcomePage } from './WelcomePage'

export function HomePage() {
  const { causes, loading } = useUserCauses()
  const { isConnected } = useAccount()
  const occupied = causes.length > 0 || isConnected

  if (occupied) {
    return (
      <Stack spacing={4} data-testid="home-dashboard">
        <YourDashboard />
        <YourCauses
          causes={causes}
          loading={loading}
          compact
          headingComponent="h2"
          footer={(
            <>
              <YourSignedStatements />
              <YourProjects />
              <YourNudgersAndNudges />
            </>
          )}
        />
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
