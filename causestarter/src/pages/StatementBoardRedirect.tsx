import { Navigate, useParams } from 'react-router-dom'

/** Old standalone board URL → statement page, fundable-projects section. */
export function StatementBoardRedirect() {
  const { statementCid } = useParams<{ statementCid: string }>()
  if (!statementCid) return <Navigate to="/" replace />
  return <Navigate to={`/statement/${statementCid}#fundable-projects`} replace />
}
