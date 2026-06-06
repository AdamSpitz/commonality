import { useEffect, useMemo, useState } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  Button,
  Divider,
  LinearProgress,
  IconButton,
  Tooltip,
  FormControlLabel,
  Switch,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { ETH_CURRENCY, type Currency } from '@commonality/sdk'
import { useAccount } from 'wagmi'
import {
  parseCanonicalChannelId,
  getChannelOverview,
  hashCanonicalId,
  type ChannelOverview,
  type ContentFundingContractSummary,
  type ContentItem,
  type ChannelState,
} from '@commonality/sdk'
import { useContentFundingState, type ContentAttestationInfo } from '../hooks/useContentFundingState'
import { getChannelDisplayLabels } from '../channelDisplay'
import { formatCurrencyAmount } from '../../shared/currency'
import { getAppUrl } from '../../shared/routing'
import { projectPathForAddress } from '../../shared/chainAddressRoutes'
import { ClaimFlowModal } from '../components/ClaimFlowModal'
import { useTrustedContentAttesters } from '../../shared/hooks/useTrustedContentAttesters'
import { ContentAttestationSummary } from '../components/ContentAttestationSummary'
import { getTrustedContentAttestationMatches } from '../components/trustedContentAttestations'

const STATE_LABELS: Record<ChannelState, string> = {
  unclaimed: 'Unclaimed',
  verified: 'Verified',
  'creator-controlled': 'Creator-Controlled',
}

const STATE_COLORS: Record<ChannelState, 'default' | 'warning' | 'success'> = {
  unclaimed: 'default',
  verified: 'warning',
  'creator-controlled': 'success',
}

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

function getContentUrl(canonicalId: string): string | null {
  // Twitter: twitter:uid:DIGITS:TWEETID
  const twitterMatch = /^twitter:uid:\d+:(\d+)$/.exec(canonicalId)
  if (twitterMatch) {
    return `https://x.com/i/web/status/${twitterMatch[1]}`
  }
  // YouTube: youtube:channel:UCID:VIDEOID
  const youtubeMatch = /^youtube:channel:[^:]+:([A-Za-z0-9_-]{11})$/.exec(canonicalId)
  if (youtubeMatch) {
    return `https://www.youtube.com/watch?v=${youtubeMatch[1]}`
  }
  // Substack: substack:PUB/SLUG
  const substackMatch = /^substack:([a-z0-9-]+)\/([A-Za-z0-9-]+)$/.exec(canonicalId)
  if (substackMatch) {
    return `https://${substackMatch[1]}.substack.com/p/${substackMatch[2]}`
  }
  return null
}

function getTotalFunding(overview: ChannelOverview): bigint {
  let total = 0n
  for (const contract of overview.contracts) {
    if (contract.project) {
      total += BigInt(contract.project.totalReceived)
    }
  }
  return total
}

function getOverviewFundingCurrency(overview: ChannelOverview): Currency {
  return overview.contracts.find(contract => contract.project)?.project?.fundingCurrency ?? ETH_CURRENCY
}

interface ChannelPageProps {
  campaignHeading?: string
  createCampaignLabel?: string
  emptyCampaignState?: string
  unclaimedHeroDescription?: string
  shareHeading?: string
  shareDescription?: string
  suggestedMessagePrefix?: string
  contractPathForAddress?: (address: string) => string
}

function ContractCard({
  contract,
  contractPathForAddress,
}: {
  contract: ContentFundingContractSummary
  contractPathForAddress: (address: string) => string
}) {
  const status = contract.status
  const progress = contract.fundingProgress

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2 }}
      component={RouterLink}
      to={contractPathForAddress(contract.contractAddress)}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip
            label={CONTRACT_STATUS_LABELS[status] ?? status}
            color={CONTRACT_STATUS_COLORS[status] ?? 'default'}
            size="small"
          />
          {contract.isThirdParty && (
            <Chip label="Fan-created" size="small" variant="outlined" />
          )}
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1, flexShrink: 0 }}>
          {contract.contentItems.length} item{contract.contentItems.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {contract.project && (
        <Stack spacing={1}>
          <Stack direction="row" spacing={3}>
            <Box>
              <Typography variant="caption" color="text.secondary">Raised</Typography>
              <Typography variant="body2">
                {formatCurrencyAmount(contract.project.totalReceived, contract.project.fundingCurrency)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Goal</Typography>
              <Typography variant="body2">
                {BigInt(contract.project.threshold) > 0n
                  ? formatCurrencyAmount(contract.project.threshold, contract.project.fundingCurrency)
                  : 'No minimum'}
              </Typography>
            </Box>
          </Stack>
          {progress !== null && (
            <LinearProgress
              variant="determinate"
              value={Math.min(progress * 100, 100)}
              color={status === 'successful' ? 'success' : status === 'failed' ? 'error' : 'primary'}
              sx={{ height: 4, borderRadius: 2 }}
            />
          )}
        </Stack>
      )}
    </Paper>
  )
}

function getYouTubeThumbnail(canonicalId: string): string | null {
  const match = /^youtube:channel:[^:]+:([A-Za-z0-9_-]{11})$/.exec(canonicalId)
  if (match) {
    return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
  }
  return null
}



const oEmbedCache = new Map<string, string>()

function ContentItemPreview({ canonicalId, url }: { canonicalId: string; url: string | null }) {
  const [oEmbedHtml, setOEmbedHtml] = useState<string | null>(null)
  const thumbnail = getYouTubeThumbnail(canonicalId)
  const externalEmbedsDisabled = import.meta.env.VITE_DISABLE_EXTERNAL_EMBEDS === 'true'

  useEffect(() => {
    if (!url || externalEmbedsDisabled) return

    const cacheKey = url

    if (canonicalId.startsWith('twitter:')) {
      if (oEmbedCache.has(cacheKey)) {
        setOEmbedHtml(oEmbedCache.get(cacheKey) ?? null)
        return
      }
      fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`)
        .then((res) => res.json())
        .then((data) => {
          oEmbedCache.set(cacheKey, data.html)
          setOEmbedHtml(data.html)
        })
        .catch(() => setOEmbedHtml(null))
    }
  }, [url, canonicalId, externalEmbedsDisabled])

  if (thumbnail) {
    return (
      <Box
        component="a"
        href={url ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ display: 'block', lineHeight: 0 }}
      >
        <Box
          component="img"
          src={thumbnail}
          alt="YouTube video"
          sx={{
            width: 160,
            height: 90,
            objectFit: 'cover',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
          }}
        />
      </Box>
    )
  }

  if (canonicalId.startsWith('twitter:') && oEmbedHtml) {
    return (
      <Box
        sx={{
          width: 200,
          '& .twitter-tweet': { display: 'none' },
        }}
        dangerouslySetInnerHTML={{ __html: oEmbedHtml }}
      />
    )
  }

  return null
}

function ContentItemRow({ item, attestations }: { item: ContentItem; attestations?: ContentAttestationInfo[] }) {
  const url = getContentUrl(item.canonicalId)
  const trustedAttesters = useTrustedContentAttesters()
  const hasTrustedAttestation = getTrustedContentAttestationMatches(attestations, trustedAttesters).length > 0
  const hasAnyAttestation = attestations && attestations.length > 0
  const isUncovered = trustedAttesters.length > 0 && !hasTrustedAttestation

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        py: 1,
        px: hasTrustedAttestation ? 1 : 0,
        bgcolor: hasTrustedAttestation ? 'success.light' : isUncovered ? 'grey.100' : 'transparent',
        borderRadius: hasTrustedAttestation ? 1 : 0,
        opacity: isUncovered ? 0.7 : 1,
      }}
    >
      <ContentItemPreview canonicalId={item.canonicalId} url={url} />
      <Typography variant="body2" sx={{ flex: 1, wordBreak: 'break-all' }} color="text.secondary">
        {item.canonicalId}
      </Typography>
      {url && (
        <Tooltip title="Open content">
          <IconButton size="small" component="a" href={url} target="_blank" rel="noopener noreferrer">
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
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
}

function CopyLinkButton({ url }: { url: string }) {
  return (
    <Button
      variant="outlined"
      startIcon={<ContentCopyIcon />}
      onClick={() => { void navigator.clipboard.writeText(url) }}
      size="small"
    >
      Copy claim link
    </Button>
  )
}

export function ChannelPage({
  campaignHeading = 'Funding Campaigns',
  createCampaignLabel = 'Create Campaign',
  emptyCampaignState = 'No funding campaigns yet for this channel.',
  unclaimedHeroDescription = 'This channel hasn\'t been claimed yet. If you\'re the creator, you can verify your identity and withdraw these funds.',
  shareHeading = 'Share with the creator',
  shareDescription = 'Know this creator? Send them the link below so they can claim their funds.',
  suggestedMessagePrefix = 'Hey! Your supporters have pooled',
  contractPathForAddress = projectPathForAddress,
}: ChannelPageProps) {
  const { platform, channelId: channelIdParam } = useParams<{ platform: string; channelId: string }>()
  const { state, projects, loading, error, contentAttestations, channelDisplayMetadata = new Map() } = useContentFundingState()
  const [claimModalOpen, setClaimModalOpen] = useState(false)
  const [showTrustedOnly, setShowTrustedOnly] = useState(false)
  const trustedAttesters = useTrustedContentAttesters()
  const { address } = useAccount()

  const canonicalChannelId = channelIdParam ? decodeURIComponent(channelIdParam) : null

  const parsedChannel = useMemo(() => {
    if (!canonicalChannelId) return null
    try {
      return parseCanonicalChannelId(canonicalChannelId)
    } catch {
      return null
    }
  }, [canonicalChannelId])

  const overview = useMemo(() => {
    if (!state || !canonicalChannelId) return null
    try {
      const channelIdBytes32 = hashCanonicalId(canonicalChannelId)
      const now = BigInt(Math.floor(Date.now() / 1000))
      return getChannelOverview(state, channelIdBytes32, { projects, now })
    } catch {
      return null
    }
  }, [state, canonicalChannelId, projects])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>
  }

  if (!overview || !canonicalChannelId) {
    return (
      <Alert severity="warning">
        Channel not found: {channelIdParam}
      </Alert>
    )
  }

  const { channel, escrow, contracts, contentItems } = overview
  const displayLabels = getChannelDisplayLabels(canonicalChannelId, channelDisplayMetadata.get(canonicalChannelId))
  const displayName = displayLabels.primary
  const totalFunding = getTotalFunding(overview)
  const fundingCurrency = getOverviewFundingCurrency(overview)
  const trustedContentItems = contentItems.filter((item) => (
    getTrustedContentAttestationMatches(contentAttestations.get(item.canonicalId), trustedAttesters).length > 0
  ))
  const visibleContentItems = showTrustedOnly ? trustedContentItems : contentItems
  const canFilterTrustedContent = trustedAttesters.length > 0 && trustedContentItems.length > 0
  const isUnclaimed = channel.state === 'unclaimed'
  const claimUrl = getAppUrl(`/content/${platform ?? 'unknown'}/${encodeURIComponent(canonicalChannelId)}`)

  const suggestedFunding = escrow.balance > 0n ? escrow.balance : totalFunding
  const suggestedMessage = [
    `${suggestedMessagePrefix} ${formatCurrencyAmount(suggestedFunding, fundingCurrency)} for your work on-chain.`,
    `You can claim it here: ${claimUrl}`,
  ].join(' ')

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Box>
            <Typography variant="h4" component="h1">
              {displayName}
            </Typography>
            {displayLabels.secondary && (
              <Typography variant="caption" color="text.secondary">
                {displayLabels.secondary}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
            <Chip
              label={STATE_LABELS[channel.state]}
              color={STATE_COLORS[channel.state]}
            />
          </Stack>
        </Stack>

        <Stack direction="row" spacing={4} sx={{ mt: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">Total Funding Raised</Typography>
            <Typography variant="h6">{formatCurrencyAmount(totalFunding, fundingCurrency)}</Typography>
          </Box>
          {escrow.balance > 0n && (
            <Box>
              <Typography variant="body2" color="text.secondary">Waiting to be claimed</Typography>
              <Typography variant="h6" color="warning.main">
                {formatCurrencyAmount(escrow.balance, fundingCurrency)}
              </Typography>
            </Box>
          )}
          {channel.owner && (
            <Box>
              <Typography variant="body2" color="text.secondary">Verified Owner</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {channel.owner}
              </Typography>
            </Box>
          )}
        </Stack>
      </Box>

      {/* Hero for unclaimed channels with escrowed funds */}
      {isUnclaimed && escrow.balance > 0n && (
        <Paper
          sx={{ p: 3, mb: 3, bgcolor: 'warning.light', borderRadius: 2 }}
          elevation={0}
        >
          <Typography variant="h5" gutterBottom>
            Supporters have pooled {formatCurrencyAmount(escrow.balance, fundingCurrency)} for {displayName}&apos;s work.
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {unclaimedHeroDescription}
          </Typography>
          <Button
            variant="contained"
            color="warning"
            size="large"
            onClick={() => setClaimModalOpen(true)}
          >
            Claim these funds
          </Button>
        </Paper>
      )}

      {/* Share / Notify Creator section — for unclaimed channels */}
      {isUnclaimed && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {shareHeading}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {shareDescription}
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Claim link
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography
                  variant="body2"
                  sx={{ fontFamily: 'monospace', wordBreak: 'break-all', flex: 1 }}
                >
                  {claimUrl}
                </Typography>
                <CopyLinkButton url={claimUrl} />
              </Stack>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Suggested message
              </Typography>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Typography variant="body2" sx={{ flex: 1, whiteSpace: 'pre-wrap' }}>
                  {suggestedMessage}
                </Typography>
                <Tooltip title="Copy message">
                  <IconButton size="small" onClick={() => { void navigator.clipboard.writeText(suggestedMessage) }}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      )}

      {/* Contracts List */}
      {contracts.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
            <Typography variant="h5">
              {campaignHeading}
            </Typography>
            <Button
              variant="contained"
              size="small"
              component={RouterLink}
              to={`/content/${platform ?? 'unknown'}/${encodeURIComponent(canonicalChannelId)}/new`}
            >
              {createCampaignLabel}
            </Button>
          </Stack>
          <Stack spacing={1.5}>
            {contracts.map((contract) => (
              <ContractCard
                key={contract.contractAddress}
                contract={contract}
                contractPathForAddress={contractPathForAddress}
              />
            ))}
          </Stack>
        </Box>
      )}

      {contracts.length === 0 && (
        <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>{emptyCampaignState}</Typography>
          <Button
            variant="contained"
            component={RouterLink}
            to={`/content/${platform ?? 'unknown'}/${encodeURIComponent(canonicalChannelId)}/new`}
          >
            {createCampaignLabel}
          </Button>
        </Paper>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Content Items */}
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="h5">
              Content Items
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {contentItems.length} total
            </Typography>
            {trustedAttesters.length > 0 && trustedContentItems.length < contentItems.length && (
              <Chip
                label={`${contentItems.length - trustedContentItems.length} uncovered`}
                size="small"
                color="warning"
                variant="outlined"
              />
            )}
            {trustedAttesters.length > 0 && trustedContentItems.length > 0 && (
              <Chip
                label={`${trustedContentItems.length} trusted`}
                size="small"
                color="success"
              />
            )}
            {(showTrustedOnly) && (
              <Typography variant="body2" color="text.secondary">
                showing {visibleContentItems.length}/{contentItems.length} trusted
              </Typography>
            )}
          </Stack>
          {canFilterTrustedContent && (
            <FormControlLabel
              control={(
                <Switch
                  checked={showTrustedOnly}
                  onChange={(event) => setShowTrustedOnly(event.target.checked)}
                />
              )}
              label="Trusted only"
              sx={{ m: 0 }}
            />
          )}
        </Stack>
        {contentItems.length === 0 ? (
          <Typography color="text.secondary">No content items registered.</Typography>
        ) : (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack divider={<Divider />} spacing={0}>
              {visibleContentItems.map((item) => {
                const attestations = contentAttestations.get(item.canonicalId)
                return (
                  <ContentItemRow key={item.contentId.toString()} item={item} attestations={attestations} />
                )
              })}
            </Stack>
          </Paper>
        )}
      </Box>

      {(channel?.state === 'unclaimed' || channel?.state === 'verified') && escrow.balance > 0n && (
        <ClaimFlowModal
          open={claimModalOpen}
          onClose={() => setClaimModalOpen(false)}
          channelDisplayName={displayName}
          channelId={canonicalChannelId ?? ''}
          platform={parsedChannel?.platform ?? 'twitter'}
          handle={parsedChannel?.stableId ?? ''}
          claimantAddress={address ?? ''}
          escrowBalance={escrow.balance}
          channelState={channel?.state ?? 'unclaimed'}
          onSuccess={() => {
            window.location.reload()
          }}
        />
      )}
    </Box>
  )
}
