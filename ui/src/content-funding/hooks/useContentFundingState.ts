import { useState, useEffect } from 'react'
import {
  fetchAndFoldContentFundingState,
  getAllChannelOverviews,
  getContentAttestations,
  getContentSubjectId,
  type ChannelWithCanonicalId,
  type ContentFundingQueryOptions,
} from '@commonality/sdk'
import type { ContentFundingState } from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { getProjectsFiltered } from '@commonality/sdk'
import type { ProjectWithMetrics } from '@commonality/sdk'

export interface ContentAttestationInfo {
  canonicalId: string
  subjectId: string
  attested: boolean
  attester: string
  statementCid: string
}

export interface ContentFundingData {
  state: ContentFundingState | null
  vetoedEvents: import('@commonality/sdk').ContractVetoedEvent[]
  projects: ProjectWithMetrics[]
  channels: ChannelWithCanonicalId[]
  contentAttestations: Map<string, ContentAttestationInfo[]>
  loading: boolean
  error: string | null
}

export function useContentFundingState(): ContentFundingData {
  const machinery = useMachinery()
  const [state, setState] = useState<ContentFundingState | null>(null)
  const [vetoedEvents, setVetoedEvents] = useState<import('@commonality/sdk').ContractVetoedEvent[]>([])
  const [projects, setProjects] = useState<ProjectWithMetrics[]>([])
  const [channels, setChannels] = useState<ChannelWithCanonicalId[]>([])
  const [contentAttestations, setContentAttestations] = useState<Map<string, ContentAttestationInfo[]>>(new Map())
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

          const canonicalIds = new Set<string>()
          for (const channel of getAllChannelOverviews(contentFundingResult.state, options)) {
            for (const contract of channel.contracts) {
              for (const item of contract.contentItems) {
                canonicalIds.add(item.canonicalId)
              }
            }
          }

          const attestationEntries = await Promise.all(
            Array.from(canonicalIds).map(async (canonicalId) => {
              const subjectId = getContentSubjectId(canonicalId)

              try {
                const attestations: ContentAttestationInfo[] = (await getContentAttestations(machinery, canonicalId)).map(attestation => ({
                  canonicalId,
                  subjectId,
                  attested: attestation.attested,
                  attester: attestation.attester,
                  statementCid: attestation.statementCid,
                }))
                return [
                  canonicalId,
                  attestations,
                ] as const
              } catch {
                return [canonicalId, [] as ContentAttestationInfo[]] as const
              }
            }),
          )

          const attestationMap = new Map<string, ContentAttestationInfo[]>(
            attestationEntries.filter(([, attestations]) => attestations.length > 0),
          )

          setContentAttestations(attestationMap)
        } else {
          setState(null)
          setVetoedEvents([])
          setProjects(allProjects)
          setChannels([])
          setContentAttestations(new Map())
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

  return { state, vetoedEvents, projects, channels, contentAttestations, loading, error }
}
