import { Navigate, useParams, useSearchParams } from 'react-router-dom'

/** Preserve bookmarked area URLs after folding their contents into the run launcher. */
export function TestDataAreaPage() {
  const { runId, areaId } = useParams()
  const [search] = useSearchParams()
  const next = new URLSearchParams(search)
  if (areaId) next.set('area', areaId)
  return <Navigate replace to={`/admin/test-data/${encodeURIComponent(runId ?? '')}?${next}`} />
}
