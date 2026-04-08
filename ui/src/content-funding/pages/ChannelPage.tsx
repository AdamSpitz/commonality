import { useMemo, useState } from 'react'
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
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { formatEther } from 'viem'
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
import { useContentFundingState } from '../hooks/useContentFundingState'
import { ClaimFlowModal } from '../components/ClaimFlowModal'

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

function getChannelDisplayName(canonicalId: string): string {
  try {
    const parsed = parseCanonicalChannelId(canonicalId)
    switch (parsed.platform) {
      case 'twitter': return `@${parsed.stableId}`
      case 'youtube': return parsed.stableId
      case 'substack': return `${parsed.stableId}.substack.com`
    }
  } catch {
    return canonicalId
  }
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

function ContractCard({ contract }: { contract: ContentFundingContractSummary }) {
  const status = contract.status
  const progress = contract.fundingProgress

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2 }}
      component={RouterLink}
      to={`/projects/${contract.contractAddress}`}
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
                {formatEther(BigInt(contract.project.totalReceived))} ETH
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Threshold</Typography>
              <Typography variant="body2">
                {formatEther(BigInt(contract.project.threshold))} ETH
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

function ContentItemRow({ item }: { item: ContentItem }) {
  const url = getContentUrl(item.canonicalId)

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
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

export function ChannelPage() {
  const { platform, channelId: channelIdParam } = useParams<{ platform: string; channelId: string }>()
  const { state, projects, loading, error } = useContentFundingState()
  const [claimModalOpen, setClaimModalOpen] = useState(false)
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
  const displayName = getChannelDisplayName(canonicalChannelId)
  const totalFunding = getTotalFunding(overview)
  const isUnclaimed = channel.state === 'unclaimed'
  const claimUrl = `${window.location.origin}/content/${platform ?? 'unknown'}/${encodeURIComponent(canonicalChannelId)}`

  const suggestedMessage = [
    `Hey! Your supporters have pooled ${formatEther(escrow.balance)} ETH for your work on-chain.`,
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
            <Typography variant="caption" color="text.secondary">
              {canonicalChannelId}
            </Typography>
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
            <Typography variant="h6">{formatEther(totalFunding)} ETH</Typography>
          </Box>
          {escrow.balance > 0n && (
            <Box>
              <Typography variant="body2" color="text.secondary">Escrowed (awaiting claim)</Typography>
              <Typography variant="h6" color="warning.main">
                {formatEther(escrow.balance)} ETH
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
            Supporters have pooled {formatEther(escrow.balance)} ETH for {displayName}&apos;s work.
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            This channel hasn&apos;t been claimed yet. If you&apos;re the creator, you can verify your
            identity and withdraw these funds.
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
            Share with the creator
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Know this creator? Send them the link below so they can claim their funds.
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
              Contracts
            </Typography>
            <Button
              variant="contained"
              size="small"
              component={RouterLink}
              to={`/content/${platform ?? 'unknown'}/${encodeURIComponent(canonicalChannelId)}/new`}
            >
              Create Contract
            </Button>
          </Stack>
          <Stack spacing={1.5}>
            {contracts.map((contract) => (
              <ContractCard key={contract.contractAddress} contract={contract} />
            ))}
          </Stack>
        </Box>
      )}

      {contracts.length === 0 && (
        <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>No contracts yet for this channel.</Typography>
          <Button
            variant="contained"
            component={RouterLink}
            to={`/content/${platform ?? 'unknown'}/${encodeURIComponent(canonicalChannelId)}/new`}
          >
            Create Contract
          </Button>
        </Paper>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Content Items */}
      <Box>
        <Typography variant="h5" gutterBottom>
          Content Items ({contentItems.length})
        </Typography>
        {contentItems.length === 0 ? (
          <Typography color="text.secondary">No content items registered.</Typography>
        ) : (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack divider={<Divider />} spacing={0}>
              {contentItems.map((item) => (
                <ContentItemRow key={item.contentId.toString()} item={item} />
              ))}
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
