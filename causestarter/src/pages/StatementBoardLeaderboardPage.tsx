import { Link as RouterLink, useParams } from 'react-router-dom'
import { Alert, Button, Stack } from '@mui/material'
import { CauseLeaderboard } from '@ui/fundingportals'

/** CauseStarter host for the shared fundingportals {@link CauseLeaderboard}, keyed by statement. */
export function StatementBoardLeaderboardPage() {
  const { statementCid } = useParams<{ statementCid: string }>()

  if (!statementCid) {
    return (
      <Stack spacing={2}>
        <Alert severity="warning" sx={{ borderRadius: 2 }}>No statement specified.</Alert>
        <Button component={RouterLink} to="/momentum" sx={{ textTransform: 'none' }}>
          Back to momentum
        </Button>
      </Stack>
    )
  }

  return (
    <CauseLeaderboard
      statementCid={statementCid}
      backLink={{ label: '← Back to board', to: `/statement/${statementCid}/board` }}
    />
  )
}
