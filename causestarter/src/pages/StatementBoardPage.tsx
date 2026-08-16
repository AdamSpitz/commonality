import { Link as RouterLink, useParams } from 'react-router-dom'
import { Alert, Button, Stack } from '@mui/material'
import { CauseBoard } from '@ui/fundingportals'
import { StarterNetworkFilterNotice } from '../components/StarterNetworkFilterNotice'

/**
 * CauseStarter host for the shared fundingportals {@link CauseBoard}.
 *
 * Keyed by statement, because that is what an alignment attestation names. A
 * cause has no board of its own; its page shows the union of its planks'
 * boards, and this is the board for one plank.
 */
export function StatementBoardPage() {
  const { statementCid } = useParams<{ statementCid: string }>()

  if (!statementCid) {
    return (
      <Stack spacing={2}>
        <Alert severity="warning" sx={{ borderRadius: 2 }}>No statement specified.</Alert>
        <Button component={RouterLink} to="/causes" sx={{ textTransform: 'none' }}>
          Back to causes
        </Button>
      </Stack>
    )
  }

  return (
    <CauseBoard
      statementCid={statementCid}
      projectLinks="local"
      navLinks={[
        { label: '← Back to statement', to: `/statement/${statementCid}` },
        {
          label: 'View Leaderboard',
          to: `/statement/${statementCid}/board/leaderboard`,
          variant: 'outlined',
        },
      ]}
      headerExtra={
        <Stack spacing={1.5}>
          <Alert severity="info" sx={{ borderRadius: 2 }} data-testid="projects-help">
            Projects vouched for as advancing this issue. Each is aligned with this
            statement, not with a cause as a whole.
          </Alert>
          <StarterNetworkFilterNotice />
        </Stack>
      }
    />
  )
}
