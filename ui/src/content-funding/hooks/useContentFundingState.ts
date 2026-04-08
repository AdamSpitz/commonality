import { useState, useEffect } from 'react'
import {
  fetchAndFoldContentFundingState,
  getAllChannelOverviews,
  type ChannelWithCanonicalId,
  type ContentFundingQueryOptions,
} from '@commonality/sdk'
import type { ContentFundingState } from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { getProjectsFiltered } from '@commonality/sdk'
import type { ProjectWithMetrics } from '@commonality/sdk'

export interface ContentFundingData {
  state: ContentFundingState | null
  vetoedEvents: import('@commonality/sdk').ContractVetoedEvent[]
  projects: ProjectWithMetrics[]
  channels: ChannelWithCanonicalId[]
  loading: boolean
  error: string | null
}

export function useContentFundingState(): ContentFundingData {
  const machinery = useMachinery()
  const [state, setState] = useState<ContentFundingState | null>(null)
  const [vetoedEvents, setVetoedEvents] = useState<import('@commonality/sdk').ContractVetoedEvent[]>([])
  const [projects, setProjects] = useState<ProjectWithMetrics[]>([])
  const [channels, setChannels] = useState<ChannelWithCanonicalId[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const [contentFundingResult, allProjects] = await Promise.all([
          fetchAndFoldContentFundingState(machinery),
          getProjectsFiltered(machinery),
        ])

        if (cancelled) return

        if (contentFundingResult) {
          setState(contentFundingResult.state)
          setVetoedEvents(contentFundingResult.vetoedEvents)
          setProjects(allProjects)

          const now = BigInt(Math.floor(Date.now() / 1000))
          const options: ContentFundingQueryOptions = {
            projects: allProjects,
            now,
            vetoedEvents: contentFundingResult.vetoedEvents,
          }
          setChannels(getAllChannelOverviews(contentFundingResult.state, options))
        } else {
          setState(null)
          setVetoedEvents([])
          setProjects(allProjects)
          setChannels([])
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading content-funding state:', err)
          setError(err instanceof Error ? err.message : 'Failed to load content-funding data')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [machinery])

  return { state, vetoedEvents, projects, channels, loading, error }
}
