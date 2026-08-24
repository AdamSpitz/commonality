import { useCallback, useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { hydrateProjectBookmarks } from '../lib/projectBookmarks'
import { loadUserProjects, type UserProject } from '../lib/userProjects'
import { useMachinery } from '../lib/useMachinery'

export function useUserProjects(): {
  projects: UserProject[]
  loading: boolean
  connected: boolean
  refresh: () => void
} {
  const machinery = useMachinery()
  const { address } = useAccount()
  const [projects, setProjects] = useState<UserProject[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!cancelled) setLoading(true)
      try {
        if (address) {
          await hydrateProjectBookmarks(machinery, address).catch(() => undefined)
        }
        const next = await loadUserProjects(machinery, address)
        if (!cancelled) setProjects(next)
      } catch {
        if (!cancelled) setProjects([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [machinery, address, tick])

  return { projects, loading, connected: Boolean(address), refresh }
}
