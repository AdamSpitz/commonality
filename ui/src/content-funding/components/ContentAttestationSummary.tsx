import { Stack, Chip, Tooltip, Typography, Box } from '@mui/material'
import MemoryIcon from '@mui/icons-material/Memory'
import PsychologyIcon from '@mui/icons-material/Psychology'
import { truncateAddress } from '../../delegation/utils'
import { useTrustedContentAttesters } from '../../shared/hooks/useTrustedContentAttesters'
import type { ContentAttestationInfo } from '../hooks/useContentFundingState'

interface ContentAttestationSummaryProps {
  attestations?: ContentAttestationInfo[]
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
