import { useState, useEffect } from 'react'
import {
  fetchAndFoldContentFundingState,
  getAllChannelOverviews,
  getContentAttestation,
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

          // Load content attestations - collect all content items from contracts
          const attestationMap = new Map<string, ContentAttestationInfo[]>()
          
          for (const channel of getAllChannelOverviews(contentFundingResult.state, options)) {
            for (const contract of channel.contracts) {
              for (const item of contract.contentItems) {
                const canonicalId = item.canonicalId
                const subjectId = getContentSubjectId(canonicalId)
                
                try {
                  const attestation = await getContentAttestation(machinery, canonicalId)
                  if (attestation) {
                    const existing = attestationMap.get(canonicalId) || []
                    existing.push({
                      canonicalId,
                      subjectId,
                      attested: attestation.attested,
                      attester: attestation.attester,
                      statementCid: attestation.statementCid,
                    })
                    attestationMap.set(canonicalId, existing)
                  }
                } catch {
                  // Skip failed attestations
                }
              }
            }
          }
          
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
