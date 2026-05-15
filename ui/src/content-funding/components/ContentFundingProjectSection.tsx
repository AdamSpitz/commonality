import { useMemo, useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Chip,
  Stack,
  FormControlLabel,
  Switch,
  Tooltip,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { formatCurrencyAmount } from '../../shared/currency'
import { ETH_CURRENCY, type ContentItem } from '@commonality/sdk'
import { getChannelDisplayLabels } from '../channelDisplay'
import { useContentFundingState, type ContentAttestationInfo } from '../hooks/useContentFundingState'
import { useTrustedContentAttesters } from '../../shared/hooks/useTrustedContentAttesters'
import { ContentAttestationSummary } from './ContentAttestationSummary'
import { getTrustedContentAttestationMatches } from './trustedContentAttestations'

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  successful: 'Succeeded',
  failed: 'Failed',
  vetoed: 'Vetoed',
  unknown: 'Unknown',
}

const CONTRACT_STATUS_COLORS: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning'> = {
  active: 'primary',
  successful: 'success',
  failed: 'error',
  vetoed: 'warning',
  unknown: 'default',
}

const STATE_LABELS: Record<string, string> = {
  unclaimed: 'Unclaimed',
  verified: 'Verified',
  'creator-controlled': 'Creator-Controlled',
}

function getContentUrl(canonicalId: string): string | null {
  const twitterMatch = /^twitter:uid:\d+:(\d+)$/.exec(canonicalId)
  if (twitterMatch) {
    return `https://x.com/i/web/status/${twitterMatch[1]}`
  }
  const youtubeMatch = /^youtube:channel:[^:]+:([A-Za-z0-9_-]{11})$/.exec(canonicalId)
  if (youtubeMatch) {
    return `https://www.youtube.com/watch?v=${youtubeMatch[1]}`
  }
  const substackMatch = /^substack:([a-z0-9-]+)\/([A-Za-z0-9-]+)$/.exec(canonicalId)
  if (substackMatch) {
    return `https://${substackMatch[1]}.substack.com/p/${substackMatch[2]}`
  }
  return null
}

function ContentItemList({ items, contentAttestations }: { items: ContentItem[]; contentAttestations?: Map<string, ContentAttestationInfo[]> }) {
  const trustedAttesters = useTrustedContentAttesters()
  const [showTrustedOnly, setShowTrustedOnly] = useState(false)

  if (items.length === 0) return null

  const trustedItems = items.filter((item) => (
    getTrustedContentAttestationMatches(contentAttestations?.get(item.canonicalId), trustedAttesters).length > 0
  ))
  const visibleItems = showTrustedOnly ? trustedItems : items
  const canFilterTrusted = trustedAttesters.length > 0 && trustedItems.length > 0
  const uncoveredCount = trustedAttesters.length > 0 ? items.length - trustedItems.length : 0

  return (
    <Box sx={{ mt: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="subtitle2" color="text.secondary">
            Content Items ({items.length})
          </Typography>
          {uncoveredCount > 0 && (
            <Chip
              label={`${uncoveredCount} uncovered`}
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
          {trustedItems.length > 0 && (
            <Chip
              label={`${trustedItems.length} trusted`}
              size="small"
              color="success"
            />
          )}
          {showTrustedOnly && (
            <Typography variant="caption" color="text.secondary">
              showing {visibleItems.length}/{items.length} trusted
            </Typography>
          )}
        </Stack>
        {canFilterTrusted && (
          <FormControlLabel
            control={(
              <Switch
                size="small"
                checked={showTrustedOnly}
                onChange={(event) => setShowTrustedOnly(event.target.checked)}
              />
            )}
            label="Trusted only"
            sx={{ m: 0 }}
          />
        )}
      </Stack>
      <Stack spacing={1}>
        {visibleItems.map((item) => {
          const url = getContentUrl(item.canonicalId)
          const attestations = contentAttestations?.get(item.canonicalId)
          const trustedMatches = getTrustedContentAttestationMatches(attestations, trustedAttesters)
          const hasTrustedAttestation = trustedMatches.length > 0
          const hasAnyAttestation = attestations && attestations.length > 0
          const isUncovered = trustedAttesters.length > 0 && !hasTrustedAttestation
          return (
            <Box
              key={item.contentId.toString()}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1,
                bgcolor: hasTrustedAttestation ? 'success.light' : isUncovered ? 'grey.100' : 'grey.50',
                border: hasTrustedAttestation ? '1px solid' : 'none',
                borderColor: 'success.main',
                opacity: isUncovered ? 0.7 : 1,
                borderRadius: 1,
              }}
            >
              <Typography
                variant="body2"
                sx={{ flex: 1, fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}
              >
                {item.canonicalId}
              </Typography>
              {url && (
                <Typography
                  component="a"
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="caption"
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  View →
                </Typography>
              )}
              {item.status === 'released' && (
                <Chip label="Released" size="small" variant="outlined" />
              )}
              {isUncovered && (
                <Tooltip title={hasAnyAttestation ? 'This content has attestations but none from your trusted attesters' : 'No attester has evaluated this content yet — it may be a coverage gap'}>
                  <Chip label="Uncovered" size="small" color="warning" variant="outlined" />
                </Tooltip>
              )}
              {hasTrustedAttestation && (
                <Chip label="Trusted attested" size="small" color="success" />
              )}
              <ContentAttestationSummary attestations={attestations} />
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}

interface ContentFundingProjectSectionProps {
  projectAddress: string
}

export function ContentFundingProjectSection({ projectAddress }: ContentFundingProjectSectionProps) {
  const { state, channels, loading, contentAttestations, channelDisplayMetadata = new Map() } = useContentFundingState()

  const contentFundingInfo = useMemo(() => {
    if (!state) return null

    const projectAddressLower = projectAddress.toLowerCase()

    for (const channel of channels) {
      const contract = channel.contracts.find(
        (c) => c.contractAddress.toLowerCase() === projectAddressLower
      )
      if (contract) {
        return {
          channel,
          contract,
        }
      }
    }

    return null
  }, [state, channels, projectAddress])

  if (loading) return null
  if (!contentFundingInfo) return null

  const { channel, contract } = contentFundingInfo
  const fundingCurrency = contract.project?.fundingCurrency ?? ETH_CURRENCY

  const canonicalChannelId = channel.canonicalChannelId

  const getPlatformFromChannelId = (channelId: string): string => {
    if (channelId.startsWith('twitter:')) return 'twitter'
    if (channelId.startsWith('youtube:')) return 'youtube'
    if (channelId.startsWith('substack:')) return 'substack'
    return 'twitter'
  }

  const displayLabels = getChannelDisplayLabels(
    canonicalChannelId,
    canonicalChannelId ? channelDisplayMetadata.get(canonicalChannelId) : null,
  )
  const platform = canonicalChannelId ? getPlatformFromChannelId(canonicalChannelId) : null
  const channelPageUrl = canonicalChannelId
    ? `/content/${platform}/${encodeURIComponent(canonicalChannelId)}`
    : null

  return (
    <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.light', borderRadius: 2 }} elevation={0}>
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <Typography variant="h6" component="h2">
          Content Funding
        </Typography>
        {contract.isThirdParty && (
          <Chip label="Fan-created" size="small" variant="outlined" />
        )}
      </Stack>

      {canonicalChannelId && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" component="span">
            Channel:{' '}
          </Typography>
          {channelPageUrl ? (
            <Typography
              component={RouterLink}
              to={channelPageUrl}
              variant="body2"
              sx={{ fontWeight: 'bold', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              {displayLabels.primary}
            </Typography>
          ) : (
            <Typography variant="body2" component="span" fontWeight="bold">
              {displayLabels.primary}
            </Typography>
          )}
          {displayLabels.secondary && (
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
              {displayLabels.secondary}
            </Typography>
          )}
        </Box>
      )}

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        <Box>
          <Typography variant="caption" color="text.secondary">Channel Status</Typography>
          <Chip
            label={STATE_LABELS[channel.channel.state] ?? channel.channel.state}
            size="small"
            sx={{ mt: 0.5 }}
          />
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Contract Status</Typography>
          <Chip
            label={CONTRACT_STATUS_LABELS[contract.status] ?? contract.status}
            color={CONTRACT_STATUS_COLORS[contract.status]}
            size="small"
            sx={{ mt: 0.5 }}
          />
        </Box>
        {channel.escrow.balance > 0n && (
          <Box>
            <Typography variant="caption" color="text.secondary">Escrowed Balance</Typography>
            <Typography variant="body2" fontWeight="bold" color="warning.main">
              {formatCurrencyAmount(channel.escrow.balance, fundingCurrency)}
            </Typography>
          </Box>
        )}
      </Stack>

      {contract.contentItems.length > 0 && (
        <ContentItemList items={contract.contentItems} contentAttestations={contentAttestations} />
      )}
    </Paper>
  )
}
