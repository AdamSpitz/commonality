import { useEffect, useState } from 'react'
import { Stack, Chip, Tooltip, Typography, Box, Divider, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'
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
  attesterType?: string
  beatId?: string
  decision?: string
  confidence?: string
  reasoning?: string
  localContextUsed?: Array<{ type?: string; contentCanonicalId?: string; summary?: string }>
  ambientContextUsed?: Array<{
    observation?: string
    observedAt?: string
    confidence?: string
    supportingExamples?: string[]
    sourceAuthorCount?: number
    timeSpanHours?: number
    diversityScore?: number
  }>
  createdAt?: string
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
  compact = true,
}: {
  entry: { kind: 'beat-agent'; name?: string; address: string; serviceUrl?: string }
  attestation: ContentAttestationInfo
  compact?: boolean
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

  return <BeatAgentExplanationDetails explanation={explanation} compact={compact} />
}

function formatAmbientCitationStats(item: NonNullable<BeatAgentExplanationDocument['ambientContextUsed']>[number]): string {
  return [
    typeof item.sourceAuthorCount === 'number' ? `${item.sourceAuthorCount} authors` : null,
    typeof item.timeSpanHours === 'number' ? `${Math.round(item.timeSpanHours)}h span` : null,
    typeof item.diversityScore === 'number' ? `diversity ${item.diversityScore.toFixed(2)}` : null,
    item.confidence ? `confidence ${item.confidence}` : null,
  ].filter(Boolean).join(' · ')
}

function BeatAgentExplanationDetails({
  explanation,
  compact,
}: {
  explanation: BeatAgentExplanationDocument
  compact: boolean
}) {
  const ambient = explanation.ambientContextUsed ?? []
  const local = explanation.localContextUsed ?? []
  const localToShow = compact ? local.slice(0, 2) : local
  const ambientToShow = compact ? ambient.slice(0, 2) : ambient
  const textVariant = compact ? 'caption' : 'body2'

  return (
    <Box sx={{ mt: compact ? 1 : 0 }}>
      {compact && <Divider sx={{ my: 1 }} />}
      {!compact && (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
          {explanation.beatId && <Chip size="small" label={`Beat: ${explanation.beatId}`} />}
          {explanation.decision && <Chip size="small" color="primary" label={`Decision: ${explanation.decision}`} />}
          {explanation.confidence && <Chip size="small" label={`Confidence: ${explanation.confidence}`} />}
          {explanation.createdAt && <Chip size="small" label={`Created: ${new Date(explanation.createdAt).toLocaleString()}`} />}
        </Stack>
      )}
      {explanation.reasoning && (
        <Typography variant={textVariant} component="div" sx={{ mb: compact ? 0.75 : 2 }}>
          <strong>Reasoning:</strong> {explanation.reasoning}
        </Typography>
      )}
      {local.length > 0 && (
        <Box sx={{ mb: compact ? 0.5 : 2 }}>
          <Typography variant={textVariant} component="div" sx={{ fontWeight: 'bold', mb: compact ? 0 : 0.5 }}>
            Local context{compact && local.length > localToShow.length ? ` (${localToShow.length} of ${local.length})` : ''}
          </Typography>
          {compact ? (
            <Typography variant="caption" component="div">
              {localToShow.map((item) => item.summary ?? item.contentCanonicalId ?? item.type ?? 'context').join('; ')}
            </Typography>
          ) : localToShow.map((item, index) => (
            <Box key={index} sx={{ mb: 1 }}>
              <Typography variant="body2" component="div">{item.summary ?? item.contentCanonicalId ?? item.type ?? 'Context'}</Typography>
              {(item.type || item.contentCanonicalId) && (
                <Typography variant="caption" component="div" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                  {[item.type, item.contentCanonicalId].filter(Boolean).join(' · ')}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}
      {ambient.length > 0 && (
        <Box>
          <Typography variant={textVariant} component="div" sx={{ fontWeight: 'bold', mb: compact ? 0 : 0.5 }}>
            Ambient context citations{compact && ambient.length > ambientToShow.length ? ` (${ambientToShow.length} of ${ambient.length})` : ''}
          </Typography>
          {ambientToShow.map((item, index) => {
            const stats = formatAmbientCitationStats(item)
            return (
              <Box key={index} sx={{ mb: compact ? 0 : 1 }}>
                <Typography variant={compact ? 'caption' : 'body2'} component="div" color={compact ? 'text.secondary' : 'text.primary'}>
                  {item.observation}
                </Typography>
                {stats && <Typography variant="caption" component="div" color="text.secondary">{stats}</Typography>}
                {!compact && item.observedAt && <Typography variant="caption" component="div" color="text.secondary">Observed: {item.observedAt}</Typography>}
                {!compact && item.supportingExamples && item.supportingExamples.length > 0 && (
                  <Typography variant="caption" component="div" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                    Examples: {item.supportingExamples.join(', ')}
                  </Typography>
                )}
              </Box>
            )
          })}
        </Box>
      )}
    </Box>
  )
}

function BeatAgentAuditDialog({
  open,
  onClose,
  entry,
  attestation,
}: {
  open: boolean
  onClose: () => void
  entry: { kind: 'beat-agent'; name?: string; address: string; serviceUrl?: string }
  attestation: ContentAttestationInfo
}) {
  const displayName = entry.name ?? truncateAddress(entry.address)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Beat-agent audit details: {displayName}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, wordBreak: 'break-all' }}>
          Attester: {entry.address}<br />
          Statement: {attestation.statementCid ?? 'unknown'}<br />
          Content: {attestation.canonicalId}
        </Typography>
        <BeatAgentExplanation entry={entry} attestation={attestation} compact={false} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
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

function BeatAgentAttestationChip({
  entry,
  attestation,
  displayName,
}: {
  entry: { kind: 'beat-agent'; name?: string; address: string; serviceUrl?: string }
  attestation: ContentAttestationInfo
  displayName: string
}) {
  const [auditOpen, setAuditOpen] = useState(false)

  return (
    <>
      <Tooltip
        title={<BeatAgentTooltip entry={entry} attestation={attestation} />}
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
          icon={<PsychologyIcon />}
          label={displayName}
          size="small"
          color="primary"
          variant="filled"
          onClick={() => setAuditOpen(true)}
        />
      </Tooltip>
      <BeatAgentAuditDialog
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        entry={entry}
        attestation={attestation}
      />
    </>
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

        if (isBeatAgent) {
          return (
            <BeatAgentAttestationChip
              key={`${attestation.attester}-${attestation.statementCid}`}
              entry={trustedAttester as { kind: 'beat-agent'; name?: string; address: string; serviceUrl?: string }}
              attestation={attestation}
              displayName={displayName}
            />
          )
        }

        return (
          <Tooltip
            key={`${attestation.attester}-${attestation.statementCid}`}
            title={(
              <ContentAttesterTooltip
                trusted={!!trustedAttester}
                name={trustedAttester?.name}
                attestation={attestation}
              />
            )}
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
              icon={trustedAttester ? <MemoryIcon /> : undefined}
              label={displayName}
              size="small"
              color="success"
              variant={trustedAttester ? 'filled' : 'outlined'}
            />
          </Tooltip>
        )
      })}
    </Stack>
  )
}
