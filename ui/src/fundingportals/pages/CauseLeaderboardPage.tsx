import { useParams } from 'react-router-dom'
import { Alert } from '@mui/material'
import { CauseLeaderboard } from '../components/CauseLeaderboard'

/**
 * Aligning domain route wrapper for the shared cause leaderboard surface.
 * Hosts (CauseStarter, etc.) should import {@link CauseLeaderboard} directly.
 */
export function CauseLeaderboardPage() {
  const { statementCid } = useParams<{ statementCid: string }>()

  if (!statementCid) {
    return <Alert severity="error">Missing statement for this cause leaderboard.</Alert>
  }

  return <CauseLeaderboard statementCid={statementCid} />
}
