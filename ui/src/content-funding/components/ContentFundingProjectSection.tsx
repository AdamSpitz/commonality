import { useMemo } from 'react'
import {
  Box,
  Typography,
  Paper,
  Chip,
  Stack,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import {
  type ContentItem,
} from '@commonality/sdk'
import { useContentFundingState } from '../hooks/useContentFundingState'

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

function getChannelDisplayName(canonicalId: string): string {
  try {
    const parts = canonicalId.split(':')
    if (parts[0] === 'twitter') return `@${parts[2]}`
    if (parts[0] === 'youtube') return parts[2] ?? canonicalId
    if (parts[0] === 'substack') return `${parts[1]}.substack.com`
  } catch {
    // fall through
  }
  return canonicalId
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

function ContentItemList({ items }: { items: ContentItem[] }) {
  if (items.length === 0) return null

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Content Items ({items.length})
      </Typography>
      <Stack spacing={1}>
        {items.map((item) => {
          const url = getContentUrl(item.canonicalId)
          return (
            <Box
              key={item.contentId.toString()}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1,
                bgcolor: 'grey.50',
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
  const { state, channels, loading } = useContentFundingState()

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

  const canonicalChannelId = channel.canonicalChannelId

  const getPlatformFromChannelId = (channelId: string): string => {
    if (channelId.startsWith('twitter:')) return 'twitter'
    if (channelId.startsWith('youtube:')) return 'youtube'
    if (channelId.startsWith('substack:')) return 'substack'
    return 'twitter'
  }

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
              {getChannelDisplayName(canonicalChannelId)}
            </Typography>
          ) : (
            <Typography variant="body2" component="span" fontWeight="bold">
              {getChannelDisplayName(canonicalChannelId)}
            </Typography>
          )}
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
            {canonicalChannelId}
          </Typography>
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
              {contract.project ? (Number(contract.project.totalReceived) / 1e18).toFixed(4) : '0'} ETH
            </Typography>
          </Box>
        )}
      </Stack>

      {contract.contentItems.length > 0 && (
        <ContentItemList items={contract.contentItems} />
      )}
    </Paper>
  )
}