import { useEffect, useState } from 'react'
import { Stack, Chip, Tooltip, Typography, Box, Divider } from '@mui/material'
import MemoryIcon from '@mui/icons-material/Memory'
import PsychologyIcon from '@mui/icons-material/Psychology'
import { fetchFromIPFS } from '@commonality/sdk'
import { truncateAddress } from '../../delegation/utils'
import { useTrustedContentAttesters } from '../../shared/hooks/useTrustedContentAttesters'
import { useMachinery } from '../../shared/hooks/useMachinery'
import type { ContentAttestationInfo } from '../hooks/useContentFundingState'

interface ContentAttestationSummaryProps {
  attestations?: ContentAttestationInfo[]
}

interface BeatAgentExplanationDocument {
  reasoning?: string
  localContextUsed?: Array<{ type?: string; contentCanonicalId?: string; summary?: string }>
  ambientContextUsed?: Array<{
    observation?: string
    sourceAuthorCount?: number
    timeSpanHours?: number
    diversityScore?: number
  }>
}

interface BeatAgentStatusResponse {
  attestation?: {
    explanationCid?: string | null
  } | null
}

function normalizeServiceUrl(serviceUrl: string): string {
  return serviceUrl.replace(/\/+$/, '')
}

function BeatAgentExplanation({
  entry,
  attestation,
}: {
  entry: { kind: 'beat-agent'; name?: string; address: string; serviceUrl?: string }
  attestation: ContentAttestationInfo
}) {
  const machinery = useMachinery()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [explanation, setExplanation] = useState<BeatAgentExplanationDocument | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadExplanation() {
      if (!entry.serviceUrl || !attestation.statementCid || !attestation.canonicalId) return

      setLoading(true)
      setError(null)
      setExplanation(null)

      try {
        const statusUrl = `${normalizeServiceUrl(entry.serviceUrl)}/status/${encodeURIComponent(attestation.statementCid)}/${encodeURIComponent(attestation.canonicalId)}`
        const response = await fetch(statusUrl)
        if (!response.ok) throw new Error(`status ${response.status}`)

        const status = await response.json() as BeatAgentStatusResponse
        const explanationCid = status.attestation?.explanationCid
        if (!explanationCid) {
          if (!cancelled) setError('No explanation document is available for this attestation yet.')
          return
        }

        const document = await fetchFromIPFS(machinery.ipfsConfig, explanationCid)
        if (!document) throw new Error('explanation not found')
        if (!cancelled) setExplanation(document as BeatAgentExplanationDocument)
      } catch {
        if (!cancelled) setError('Could not load the beat-agent explanation document.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadExplanation()

    return () => {
      cancelled = true
    }
  }, [attestation.canonicalId, attestation.statementCid, entry.serviceUrl, machinery.ipfsConfig])

  if (!entry.serviceUrl) {
    return (
      <Typography variant="caption" component="div" color="text.secondary" sx={{ mt: 1 }}>
        Add this beat agent&apos;s service URL in Settings to load explanation/context citations.
      </Typography>
    )
  }

  if (loading) return <Typography variant="caption" component="div" sx={{ mt: 1 }}>Loading explanation…</Typography>
  if (error) return <Typography variant="caption" component="div" color="text.secondary" sx={{ mt: 1 }}>{error}</Typography>
  if (!explanation) return null

  const ambient = explanation.ambientContextUsed ?? []
  const local = explanation.localContextUsed ?? []

  return (
    <Box sx={{ mt: 1 }}>
      <Divider sx={{ my: 1 }} />
      {explanation.reasoning && (
        <Typography variant="caption" component="div" sx={{ mb: 0.75 }}>
          <strong>Reasoning:</strong> {explanation.reasoning}
        </Typography>
      )}
      {local.length > 0 && (
        <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
          <strong>Local context:</strong> {local.slice(0, 2).map((item) => item.summary ?? item.contentCanonicalId ?? item.type ?? 'context').join('; ')}
        </Typography>
      )}
      {ambient.length > 0 && (
        <Box>
          <Typography variant="caption" component="div" sx={{ fontWeight: 'bold' }}>
            Ambient context citations
          </Typography>
          {ambient.slice(0, 2).map((item, index) => (
            <Typography key={index} variant="caption" component="div" color="text.secondary">
              {item.observation}
              {typeof item.sourceAuthorCount === 'number' && ` · ${item.sourceAuthorCount} authors`}
              {typeof item.timeSpanHours === 'number' && ` · ${Math.round(item.timeSpanHours)}h span`}
              {typeof item.diversityScore === 'number' && ` · diversity ${item.diversityScore.toFixed(2)}`}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  )
}

function BeatAgentTooltip({
  entry,
  attestation,
}: {
  entry: { kind: 'beat-agent'; name?: string; address: string; serviceUrl?: string }
  attestation: ContentAttestationInfo
}) {
  const displayName = entry.name ?? truncateAddress(entry.address)

  return (
    <Box sx={{ p: 0.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
        Trusted beat agent: {displayName}
      </Typography>
      <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
        This agent follows the conversation in its beat, using ambient discourse context to evaluate short-form content that cannot be judged from the post text alone.
      </Typography>
      <Typography variant="caption" component="div" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
        Address: {entry.address}
      </Typography>
      {attestation.statementCid && (
        <Typography variant="caption" component="div" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
          Statement: {attestation.statementCid}
        </Typography>
      )}
      <BeatAgentExplanation entry={entry} attestation={attestation} />
    </Box>
  )
}

function ContentAttesterTooltip({
  trusted,
  attestation,
}: {
  trusted: boolean
  name?: string
  attestation: ContentAttestationInfo
}) {
  return (
    <Box sx={{ p: 0.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
        {trusted ? 'Trusted content attester' : 'Untrusted content attester'}
      </Typography>
      <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
        A stateless evaluator that assesses content based on the content text and retrievable local context alone, without maintaining ongoing discourse awareness.
      </Typography>
      <Typography variant="caption" component="div" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
        Address: {attestation.attester}
      </Typography>
      {attestation.statementCid && (
        <Typography variant="caption" component="div" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
          Statement: {attestation.statementCid}
        </Typography>
      )}
    </Box>
  )
}

export function ContentAttestationSummary({ attestations }: ContentAttestationSummaryProps) {
  const trustedAttesters = useTrustedContentAttesters()

  if (!attestations || attestations.length === 0) {
    return null
  }

  const trustedByAddress = new Map(trustedAttesters.map((attester) => [attester.address.toLowerCase(), attester]))
  const sortedAttestations = [...attestations].sort((a, b) =>
    a.attester.toLowerCase().localeCompare(b.attester.toLowerCase()),
  )

  return (
    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
      {sortedAttestations.map((attestation) => {
        const trustedAttester = trustedByAddress.get(attestation.attester.toLowerCase())
        const isBeatAgent = trustedAttester?.kind === 'beat-agent'
        const displayName = trustedAttester?.name ?? truncateAddress(attestation.attester)

        const tooltipTitle = isBeatAgent
          ? (
              <BeatAgentTooltip
                entry={trustedAttester as { kind: 'beat-agent'; name?: string; address: string; serviceUrl?: string }}
                attestation={attestation}
              />
            )
          : (
              <ContentAttesterTooltip
                trusted={!!trustedAttester}
                name={trustedAttester?.name}
                attestation={attestation}
              />
            )

        return (
          <Tooltip
            key={`${attestation.attester}-${attestation.statementCid}`}
            title={tooltipTitle}
            arrow
            slotProps={{
              tooltip: {
                sx: {
                  maxWidth: 400,
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  boxShadow: 3,
                },
              },
            }}
          >
            <Chip
              icon={isBeatAgent ? <PsychologyIcon /> : trustedAttester ? <MemoryIcon /> : undefined}
              label={displayName}
              size="small"
              color={isBeatAgent ? 'primary' : 'success'}
              variant={trustedAttester ? 'filled' : 'outlined'}
            />
          </Tooltip>
        )
      })}
    </Stack>
  )
}
