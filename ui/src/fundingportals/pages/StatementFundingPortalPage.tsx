import { useParams } from 'react-router-dom'
import { Alert } from '@mui/material'
import { CauseBoard } from '../components/CauseBoard'

/**
 * Aligning domain route wrapper for the shared cause board surface.
 * Hosts (CauseStarter, etc.) should import {@link CauseBoard} directly.
 */
export function StatementFundingPortalPage() {
  const { statementCid } = useParams<{ statementCid: string }>()

  if (!statementCid) {
    return <Alert severity="error">Missing statement for this fundable-projects board.</Alert>
  }

  return <CauseBoard statementCid={statementCid} />
}
