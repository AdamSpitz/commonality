import {
  Card,
  CardActionArea,
  CardContent,
  Box,
  Typography,
  Chip,
  Stack,
  LinearProgress,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { formatEther } from 'viem'
import {
  getProjectStatus,
  STATUS_COLORS,
  STATUS_LABELS,
  formatRelativeDeadline,
} from '../../pubstarter/utils'
import { useContentFundingState } from '../../content-funding/hooks/useContentFundingState'

export type AlignedProject = {
  projectAddress: string
  alignmentType: 'direct' | 'indirect'
  totalReceived: string
  threshold: string
  deadline: string
}

export type ProjectMetadata = { name?: string; description?: string }

export type ContentFundingInfo = {
  channelCanonicalId: string | null
  channelState: 'unclaimed' | 'verified' | 'creator-controlled'
  isThirdParty: boolean
  contractStatus: 'active' | 'successful' | 'failed' | 'vetoed' | 'unknown'
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

function useContentFundingInfo(projectAddress: string): ContentFundingInfo | null {
  const { state, channels } = useContentFundingState()

  if (!state) return null

  const projectAddressLower = projectAddress.toLowerCase()

  for (const channel of channels) {
    const contract = channel.contracts.find(
      (c) => c.contractAddress.toLowerCase() === projectAddressLower
    )
    if (contract) {
      return {
        channelCanonicalId: channel.canonicalChannelId,
        channelState: channel.channel.state,
        isThirdParty: contract.isThirdParty,
        contractStatus: contract.status,
      }
    }
  }

  return null
}

function ContentFundingBadge({ info }: { info: ContentFundingInfo }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Chip
        label="Content Funding"
        size="small"
        sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}
      />
      {info.isThirdParty && (
        <Chip label="Fan-created" size="small" variant="outlined" />
      )}
    </Stack>
  )
}

function ContentFundingCardDetails({ info }: { info: ContentFundingInfo }) {
  const channelStateLabels: Record<string, string> = {
    unclaimed: 'Unclaimed',
    verified: 'Verified',
    'creator-controlled': 'Creator-Controlled',
  }

  const contractStatusLabels: Record<string, string> = {
    active: 'Active',
    successful: 'Succeeded',
    failed: 'Failed',
    vetoed: 'Vetoed',
    unknown: 'Unknown',
  }

  return (
    <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        {info.channelCanonicalId && (
          <Box>
            <Typography variant="caption" color="text.secondary">Channel</Typography>
            <Typography variant="body2" fontWeight="bold">
              {getChannelDisplayName(info.channelCanonicalId)}
            </Typography>
          </Box>
        )}
        <Box>
          <Typography variant="caption" color="text.secondary">Channel Status</Typography>
          <Typography variant="body2">{channelStateLabels[info.channelState]}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Contract</Typography>
          <Chip
            label={contractStatusLabels[info.contractStatus]}
            size="small"
            color={info.contractStatus === 'successful' ? 'success' : info.contractStatus === 'active' ? 'primary' : 'default'}
          />
        </Box>
      </Stack>
    </Box>
  )
}

export function AlignedProjectCard({
  project,
  metadata,
}: {
  project: AlignedProject
  metadata: ProjectMetadata | undefined
}) {
  const status = getProjectStatus(project)
  const fundingProgress =
    BigInt(project.threshold) > 0n
      ? Number((BigInt(project.totalReceived) * 10000n) / BigInt(project.threshold)) / 100
      : 0
  const progressPercent = Math.min(fundingProgress, 100)

  const contentFundingInfo = useContentFundingInfo(project.projectAddress)

  return (
    <Card>
      <CardActionArea component={RouterLink} to={`/projects/${project.projectAddress}`}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
              {metadata?.name || `Project ${project.projectAddress.slice(0, 8)}...`}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ ml: 1 }}>
              {contentFundingInfo && <ContentFundingBadge info={contentFundingInfo} />}
              <Chip
                label={project.alignmentType === 'direct' ? 'Direct' : 'Indirect'}
                size="small"
                variant="outlined"
                color={project.alignmentType === 'direct' ? 'primary' : 'default'}
              />
              <Chip label={STATUS_LABELS[status]} color={STATUS_COLORS[status]} size="small" />
              <Chip label={formatRelativeDeadline(project.deadline)} size="small" variant="outlined" />
            </Stack>
          </Box>

          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {formatEther(BigInt(project.totalReceived))} / {formatEther(BigInt(project.threshold))} ETH
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(fundingProgress)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progressPercent}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          {contentFundingInfo && <ContentFundingCardDetails info={contentFundingInfo} />}
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
