import { loadWorkRequestBoard, type WorkRequestBoard } from '@commonality/sdk/work-requests'
import { useEffect, useState } from 'react'
import { useMachinery } from '../../shared'

export function useWorkRequests(): { board: WorkRequestBoard | null; loading: boolean; error: string | null; reload: () => void } {
  const machinery = useMachinery()
  const [board, setBoard] = useState<WorkRequestBoard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadWorkRequestBoard(machinery)
      .then((next) => {
        if (!cancelled) {
          setBoard(next)
          setError(null)
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load requests for work.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [machinery, nonce])

  return { board, loading, error, reload: () => setNonce((value) => value + 1) }
}
