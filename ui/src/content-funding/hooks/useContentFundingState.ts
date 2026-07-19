import { useState, useEffect } from 'react'
import { fetchAndFoldContentFundingState, getAllChannelOverviews, getContentAttestations, getContentSubjectId, parseCanonicalChannelId, type ChannelWithCanonicalId, type ContentFundingQueryOptions } from '@commonality/sdk/content-funding'
import { createDefaultDocumentReader, type DisplayableDocument } from '@commonality/sdk/displayable-documents'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import type { ContentFundingState } from '@commonality/sdk/content-funding'
import type { ChannelDisplayMetadata } from '../channelDisplay'
import { useMachinery } from '../../shared'
import type { UiRuntimeConfig } from '../../shared'
import { getRuntimeConfig, isCidDeniedByDisplayDenylist, loadDisplayDenylist } from '../../shared'
import { getProjectsFiltered } from '@commonality/sdk/lazy-giving'
import type { ProjectWithMetrics } from '@commonality/sdk/lazy-giving'

export interface ContentAttestationInfo {
  canonicalId: string
  subjectId: string
  attested: boolean
  attester: string
  statementCid: string
}

interface ChannelMetadataLookupConfig {
  enabled: boolean
  baseUrl?: string
}

export function resolveChannelMetadataLookupConfig(config: UiRuntimeConfig = getRuntimeConfig()): ChannelMetadataLookupConfig {
  const environment = config.COMMONALITY_ENVIRONMENT ?? 'local'
  const enabled = config.VITE_ENABLE_CHANNEL_METADATA_LOOKUP === 'true'
  const configuredBaseUrl = config.VITE_PLATFORM_API_URL

  if (environment !== 'local') {
    if (!enabled) {
      throw new Error(`Channel metadata lookup is required for ${environment}. Set VITE_ENABLE_CHANNEL_METADATA_LOOKUP=true and configure the deployed platform API.`)
    }
    if (!configuredBaseUrl) {
      throw new Error(`Channel metadata lookup is required for ${environment}, but VITE_PLATFORM_API_URL is not configured.`)
    }
  }

  return {
    enabled,
    baseUrl: configuredBaseUrl || 'http://localhost:3001',
  }
}

function channelMetadataFromDocument(document: DisplayableDocument): ChannelDisplayMetadata | null {
  const extras = document.extras
  if (!extras || typeof extras !== 'object') return null

  const metadata: ChannelDisplayMetadata = {}
  for (const key of ['displayName', 'handle', 'creatorDisplayName', 'channelDisplayName', 'channelHandle'] as const) {
    const value = extras[key]
    if (typeof value === 'string' && value.trim()) metadata[key] = value
  }

  const name = extras.name
  if (!metadata.displayName && typeof name === 'string' && name.trim()) metadata.displayName = name
  return Object.keys(metadata).length > 0 ? metadata : null
}

async function fetchPlatformChannelMetadata(canonicalId: string, baseUrl: string): Promise<ChannelDisplayMetadata | null> {
  let platform: string
  try {
    platform = parseCanonicalChannelId(canonicalId).platform
  } catch {
    return null
  }

  if (platform !== 'twitter' && platform !== 'youtube') return null

  const response = await fetch(`${baseUrl}/resolve/channel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform, handle: canonicalId }),
  }).catch(() => null)

  if (!response?.ok) return null
  const metadata = await response.json().catch(() => null)
  return metadata && typeof metadata === 'object' ? metadata as ChannelDisplayMetadata : null
}

export interface ContentFundingData {
  state: ContentFundingState | null
  vetoedEvents: import('@commonality/sdk/content-funding').ContractVetoedEvent[]
  projects: ProjectWithMetrics[]
  channels: ChannelWithCanonicalId[]
  contentAttestations: Map<string, ContentAttestationInfo[]>
  channelDisplayMetadata: Map<string, ChannelDisplayMetadata>
  loading: boolean
  error: string | null
  machinery: ReturnType<typeof useMachinery>
}

export function useContentFundingState(): ContentFundingData {
  const machinery = useMachinery()
  const [state, setState] = useState<ContentFundingState | null>(null)
  const [vetoedEvents, setVetoedEvents] = useState<import('@commonality/sdk/content-funding').ContractVetoedEvent[]>([])
  const [projects, setProjects] = useState<ProjectWithMetrics[]>([])
  const [channels, setChannels] = useState<ChannelWithCanonicalId[]>([])
  const [contentAttestations, setContentAttestations] = useState<Map<string, ContentAttestationInfo[]>>(new Map())
  const [channelDisplayMetadata, setChannelDisplayMetadata] = useState<Map<string, ChannelDisplayMetadata>>(new Map())
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
          const channelOverviews = getAllChannelOverviews(contentFundingResult.state, options)
          setChannels(channelOverviews)

          const channelMetadataLookup = resolveChannelMetadataLookupConfig()
          const displayDenylist = await loadDisplayDenylist()
          const documentReader = createDefaultDocumentReader(machinery)
          const displayMetadataEntries = await Promise.all(
            channelOverviews
              .filter(channel => channel.canonicalChannelId)
              .map(async (channel) => {
                const canonicalChannelId = channel.canonicalChannelId
                if (!canonicalChannelId) return ['', null] as const

                const apiMetadata = channelMetadataLookup.enabled && channelMetadataLookup.baseUrl
                  ? await fetchPlatformChannelMetadata(canonicalChannelId, channelMetadataLookup.baseUrl).catch(() => null)
                  : null
                if (apiMetadata) return [canonicalChannelId, apiMetadata] as const

                const metadataCid = channel.contracts.find(contract => contract.project?.metadataCid)?.project?.metadataCid
                if (!metadataCid || isCidDeniedByDisplayDenylist(metadataCid, displayDenylist)) return [canonicalChannelId, null] as const

                const metadataResult = await documentReader.read(metadataCid as IpfsCidV1).catch(() => null)
                if (metadataResult?.status !== 'active') return [canonicalChannelId, null] as const

                return [canonicalChannelId, channelMetadataFromDocument(metadataResult.document)] as const
              }),
          )
          setChannelDisplayMetadata(new Map(
            displayMetadataEntries.filter((entry): entry is readonly [string, ChannelDisplayMetadata] => entry[1] !== null),
          ))

          const canonicalIds = new Set<string>()
          for (const channel of channelOverviews) {
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
          setChannelDisplayMetadata(new Map())
        }
      } catch (err) {
        if (!cancelled) {
          // Content-funding data is often supplemental on cross-domain pages. Surface
          // the error in UI state, but do not emit a browser console error for
          // transient event-cache outages during expected local-stack restarts.
          console.warn('Error loading content-funding state:', err)
          setError(err instanceof Error ? err.message : 'Failed to load content-funding data')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [machinery])

  return { state, vetoedEvents, projects, channels, contentAttestations, channelDisplayMetadata, loading, error, machinery }
}
