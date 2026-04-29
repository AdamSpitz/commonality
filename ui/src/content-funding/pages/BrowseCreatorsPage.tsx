import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  LinearProgress,
  Tabs,
  Tab,
} from '@mui/material'
import SortIcon from '@mui/icons-material/Sort'
import { formatEther } from 'viem'
import { parseCanonicalChannelId, type ContentFundingPlatform } from '@commonality/sdk'
import { getChannelDisplayLabels } from '../channelDisplay'
import { useContentFundingState } from '../hooks/useContentFundingState'
import type { ChannelWithCanonicalId } from '@commonality/sdk'
import type { ChannelState } from '@commonality/sdk'

type SortOption = 'mostFunded' | 'mostContracts' | 'newestActivity'
type StatusFilter = 'all' | ChannelState

const PLATFORM_LABELS: Record<ContentFundingPlatform, string> = {
  twitter: 'Twitter / X',
  youtube: 'YouTube',
  substack: 'Substack',
}

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

function getTotalFunding(channel: ChannelWithCanonicalId): bigint {
  let total = 0n
  for (const contract of channel.contracts) {
    if (contract.project) {
      total += BigInt(contract.project.totalReceived)
    }
  }
  return total
}

function getActiveContractCount(channel: ChannelWithCanonicalId): number {
  return channel.contracts.filter(c => c.status === 'active').length
}

function getLatestActivityBlock(channel: ChannelWithCanonicalId): bigint {
  let maxBlock = 0n
  for (const contract of channel.contracts) {
    if (contract.project?.blockNumber) {
      const bn = BigInt(contract.project.blockNumber)
      if (bn > maxBlock) maxBlock = bn
    }
  }
  return maxBlock
}

function sortChannels(channels: ChannelWithCanonicalId[], sortBy: SortOption): ChannelWithCanonicalId[] {
  return [...channels].sort((a, b) => {
    switch (sortBy) {
      case 'mostFunded': {
        const af = getTotalFunding(a)
        const bf = getTotalFunding(b)
        return af > bf ? -1 : af < bf ? 1 : 0
      }
      case 'mostContracts': {
        const ac = a.contracts.length
        const bc = b.contracts.length
        return bc - ac
      }
      case 'newestActivity': {
        const ab = getLatestActivityBlock(a)
        const bb = getLatestActivityBlock(b)
        return ab > bb ? -1 : ab < bb ? 1 : 0
      }
    }
  })
}

const PLATFORM_ORDER: ContentFundingPlatform[] = ['twitter', 'youtube', 'substack']

interface BrowseCreatorsPageProps {
  title?: string
  description?: string
}

export function BrowseCreatorsPage({
  title = 'Creators',
  description = 'Any piece of content with a URL can be registered and funded here. Browse by platform to find creators aligned with the causes you care about. If you\'re a creator, claim your channel to receive funds directly.',
}: BrowseCreatorsPageProps) {
  const { platform } = useParams<{ platform: string }>()
  const navigate = useNavigate()
  const { channels, channelDisplayMetadata = new Map(), loading, error } = useContentFundingState()
  const [sortBy, setSortBy] = useState<SortOption>('mostFunded')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const activePlatform = (platform && platform in PLATFORM_LABELS)
    ? platform as ContentFundingPlatform
    : 'twitter'

  const filteredChannels = useMemo(() => {
    let result = channels

    // Filter by platform from route
    if (platform) {
      result = result.filter(ch => {
        if (!ch.canonicalChannelId) return false
        try {
          const parsed = parseCanonicalChannelId(ch.canonicalChannelId)
          return parsed.platform === platform
        } catch {
          return false
        }
      })
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(ch => ch.channel.state === statusFilter)
    }

    // Only show channels with at least one contract
    result = result.filter(ch => ch.contracts.length > 0)

    return sortChannels(result, sortBy)
  }, [channels, platform, sortBy, statusFilter])

  const platformLabel = platform && platform in PLATFORM_LABELS
    ? PLATFORM_LABELS[platform as ContentFundingPlatform]
    : platform ?? 'All Platforms'

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {title}
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 2, maxWidth: 680 }}>
        {description}
      </Typography>

      <Tabs
        value={activePlatform}
        onChange={(_, v) => navigate(`/content/${v}`)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        {PLATFORM_ORDER.map((p) => (
          <Tab key={p} label={PLATFORM_LABELS[p]} value={p} />
        ))}
      </Tabs>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
            <SortIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">Sort:</Typography>
            <ToggleButtonGroup
              value={sortBy}
              exclusive
              onChange={(_, v) => { if (v) setSortBy(v) }}
              size="small"
            >
              <ToggleButton value="mostFunded">Most Funded</ToggleButton>
              <ToggleButton value="mostContracts">Most Contracts</ToggleButton>
              <ToggleButton value="newestActivity">Newest Activity</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
            <Typography variant="body2" color="text.secondary">Status:</Typography>
            <ToggleButtonGroup
              value={statusFilter}
              exclusive
              onChange={(_, v) => { if (v) setStatusFilter(v) }}
              size="small"
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="unclaimed">Unclaimed</ToggleButton>
              <ToggleButton value="verified">Verified</ToggleButton>
              <ToggleButton value="creator-controlled">Creator-Controlled</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>
      </Paper>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {!loading && !error && filteredChannels.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No creators found for {platformLabel}.
          </Typography>
        </Paper>
      )}

      {!loading && !error && filteredChannels.length > 0 && (
        <Stack spacing={2}>
          {filteredChannels.map((channel) => {
            const state = channel.channel.state
            const labels = getChannelDisplayLabels(
              channel.canonicalChannelId,
              channel.canonicalChannelId ? channelDisplayMetadata.get(channel.canonicalChannelId) : null,
            )
            const totalFunding = getTotalFunding(channel)
            const activeContracts = getActiveContractCount(channel)
            const escrowBalance = channel.escrow.balance

            // Encode channel identifier for the URL
            const channelUrlSegment = encodeURIComponent(
              channel.canonicalChannelId ?? channel.channel.channelId
            )
            const channelPlatform = channel.canonicalChannelId
              ? (() => {
                  try { return parseCanonicalChannelId(channel.canonicalChannelId).platform }
                  catch { return platform ?? 'unknown' }
                })()
              : (platform ?? 'unknown')

            return (
              <Card key={channel.channel.channelId}>
                <CardActionArea
                  component={RouterLink}
                  to={`/content/${channelPlatform}/${channelUrlSegment}`}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography variant="h6" component="h2">
                          {labels.primary}
                        </Typography>
                        {labels.secondary && (
                          <Typography variant="caption" color="text.secondary">
                            {labels.secondary}
                          </Typography>
                        )}
                      </Box>
                      <Stack direction="row" spacing={1} sx={{ ml: 1, flexShrink: 0 }}>
                        <Chip
                          label={STATE_LABELS[state]}
                          color={STATE_COLORS[state]}
                          size="small"
                        />
                      </Stack>
                    </Box>

                    <Stack direction="row" spacing={3} sx={{ mt: 1 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Contracts
                        </Typography>
                        <Typography variant="body1">
                          {activeContracts} active / {channel.contracts.length} total
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Total Funding
                        </Typography>
                        <Typography variant="body1">
                          {formatEther(totalFunding)} ETH
                        </Typography>
                      </Box>
                      {escrowBalance > 0n && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Escrowed
                          </Typography>
                          <Typography variant="body1" color="warning.main">
                            {formatEther(escrowBalance)} ETH
                          </Typography>
                        </Box>
                      )}
                    </Stack>

                    {channel.contracts.length > 0 && (
                      <Box sx={{ mt: 1.5 }}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(
                            activeContracts > 0
                              ? (channel.contracts.filter(c => c.status === 'successful').length / channel.contracts.length) * 100
                              : 0,
                            100,
                          )}
                          sx={{ height: 4, borderRadius: 2 }}
                          color="success"
                        />
                      </Box>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            )
          })}
        </Stack>
      )}
    </Box>
  )
}
