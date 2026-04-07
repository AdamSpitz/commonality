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
  projects: ProjectWithMetrics[]
  channels: ChannelWithCanonicalId[]
  loading: boolean
  error: string | null
}

export function useContentFundingState(): ContentFundingData {
  const machinery = useMachinery()
  const [state, setState] = useState<ContentFundingState | null>(null)
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

        const [contentFundingState, allProjects] = await Promise.all([
          fetchAndFoldContentFundingState(machinery),
          getProjectsFiltered(machinery),
        ])

        if (cancelled) return

        setState(contentFundingState)
        setProjects(allProjects)

        if (contentFundingState) {
          const now = BigInt(Math.floor(Date.now() / 1000))
          const options: ContentFundingQueryOptions = {
            projects: allProjects,
            now,
          }
          setChannels(getAllChannelOverviews(contentFundingState, options))
        } else {
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

  return { state, projects, channels, loading, error }
}
