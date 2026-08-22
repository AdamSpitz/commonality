import { CircularProgress, Stack, Typography } from '@mui/material'
import { YourCauses } from '../components/YourCauses'
import { YourNudgersAndNudges } from '../components/YourNudgersAndNudges'
import { YourProjects } from '../components/YourProjects'
import { YourSignedStatements } from '../components/YourSignedStatements'
import { useUserCauses } from '../hooks/useUserCauses'
import { WelcomePage } from './WelcomePage'

export function HomePage() {
  const { causes, loading } = useUserCauses()

  if (causes.length > 0) {
    return (
      <YourCauses
        causes={causes}
        loading={loading}
        testId="home-dashboard"
        footer={(
          <>
            <YourSignedStatements />
            <YourProjects />
            <YourNudgersAndNudges />
          </>
        )}
      />
    )
  }

  if (loading) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 3 }} data-testid="home-loading">
        <CircularProgress size={18} />
        <Typography variant="body2" color="text.secondary">
          Loading causes…
        </Typography>
      </Stack>
    )
  }

  return <WelcomePage />
}
