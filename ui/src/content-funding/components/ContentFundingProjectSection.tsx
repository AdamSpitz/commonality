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
  Link,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { formatCurrencyAmount } from '../../shared'
import { getContentItemKey, type ContentItem } from '@commonality/sdk/content-funding'
import { ETH_CURRENCY } from '@commonality/sdk/utils'
import { getChannelDisplayLabels } from '../channelDisplay'
import { useContentFundingState, type ContentAttestationInfo } from '../hooks/useContentFundingState'
import { useTrustedContentAttesters } from '../../shared'
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

function ContentItemList({
  items,
  contentAttestations,
  highlightStatementCids,
}: {
  items: ContentItem[]
  contentAttestations?: Map<string, ContentAttestationInfo[]>
  highlightStatementCids?: readonly string[]
}) {
  const trustedAttesters = useTrustedContentAttesters()
  const [showTrustedOnly, setShowTrustedOnly] = useState(false)
  const highlight = new Set((highlightStatementCids ?? []).filter(Boolean))

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
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        This round funds the whole batch if the threshold is met. Only posts marked Aligned
        have a current positive attestation.
      </Typography>
      <Stack spacing={1}>
        {visibleItems.map((item) => {
          const url = getContentUrl(item.canonicalId)
          const attestations = contentAttestations?.get(item.canonicalId)
          const trustedMatches = getTrustedContentAttestationMatches(attestations, trustedAttesters)
          const hasTrustedAttestation = trustedMatches.length > 0
          const hasAnyAttestation = attestations && attestations.length > 0
          const isUncovered = trustedAttesters.length > 0 && !hasTrustedAttestation
          const alignedAttestations = (attestations ?? []).filter((entry) => (
            entry.attested && (highlight.size === 0 || highlight.has(entry.statementCid))
          ))
          const isAligned = alignedAttestations.length > 0
          return (
            <Box
              key={getContentItemKey(item)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1,
                bgcolor: (theme) => {
                  if (hasTrustedAttestation) {
                    return alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.16 : 0.12)
                  }
                  return theme.palette.action.hover
                },
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
              {isAligned ? (
                <Chip label="Aligned" size="small" color="success" />
              ) : (
                <Chip label="Not attested as aligned" size="small" variant="outlined" />
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
  const [searchParams] = useSearchParams()
  const highlightStatementCids = (searchParams.get('aligned') ?? '')
    .split(',')
    .map((cid) => decodeURIComponent(cid.trim()))
    .filter(Boolean)
  const { state, channels, loading, contentAttestations, channelDisplayMetadata = new Map() } = useContentFundingState()

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- React Compiler can't preserve this memo as-is; not worth restructuring for an unrelated lint rule
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
  const claimChannelPath = channelPageUrl ? `${channelPageUrl}?claim=1` : null
  const isUnclaimed = channel.channel.state === 'unclaimed'

  return (
    <Paper
      sx={{
        p: 3,
        mb: 3,
        bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.12),
        borderRadius: 2,
      }}
      elevation={0}
    >
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <Typography variant="h6" component="h2">
          Content Funding
        </Typography>
        {contract.isThirdParty && (
          <Tooltip title="This project was created by a third party. None of the money will go to anyone but the actual content creator.">
            <Chip label="Fan-created" size="small" variant="outlined" />
          </Tooltip>
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
          {isUnclaimed ? (
            <Tooltip
              title={(
                <>
                  This channel has not been claimed yet. If you are the creator, you can verify
                  ownership and collect any funds waiting for you.
                  {claimChannelPath && (
                    <>
                      {' '}
                      <Link
                        component={RouterLink}
                        to={claimChannelPath}
                        underline="always"
                        color="inherit"
                      >
                        Claim this channel
                      </Link>
                    </>
                  )}
                </>
              )}
            >
              <Chip
                label={STATE_LABELS.unclaimed}
                size="small"
                sx={{ mt: 0.5 }}
              />
            </Tooltip>
          ) : (
            <Chip
              label={STATE_LABELS[channel.channel.state] ?? channel.channel.state}
              size="small"
              sx={{ mt: 0.5 }}
            />
          )}
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
        <ContentItemList
          items={contract.contentItems}
          contentAttestations={contentAttestations}
          highlightStatementCids={highlightStatementCids}
        />
      )}
    </Paper>
  )
}
