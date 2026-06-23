import {
  Card,
  CardActions,
  CardActionArea,
  CardContent,
  Box,
  Typography,
  Chip,
  Stack,
  LinearProgress,
  Button,
} from '@mui/material'
import { getDomainUrl } from '../../domains/domainUrls'
import type { Currency } from '@commonality/sdk'
import {
  getProjectStatus,
  STATUS_COLORS,
  STATUS_LABELS,
  formatRelativeDeadline,
} from '../../lazy-giving'
import {
  getChannelDisplayLabels,
  type ChannelDisplayMetadata,
  useContentFundingState,
} from '../../content-funding'
import { formatCurrencyProgress } from '../../shared'
import { projectPathForAddress } from '../../shared'

export type AlignedProject = {
  projectAddress: string
  alignmentType: 'direct' | 'indirect'
  fundingCurrency: Currency
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
  contentItemCount: number
  channelDisplayMetadata?: ChannelDisplayMetadata
}

function useContentFundingInfo(projectAddress: string): ContentFundingInfo | null {
  const { state, channels, channelDisplayMetadata = new Map() } = useContentFundingState()

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
        contentItemCount: contract.contentItems.length,
        channelDisplayMetadata: channel.canonicalChannelId
          ? channelDisplayMetadata.get(channel.canonicalChannelId)
          : undefined,
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

function alignmentExplanation(alignmentType: AlignedProject['alignmentType']) {
  return alignmentType === 'direct'
    ? 'Direct alignment: someone vouched that this project serves this cause.'
    : 'Indirect alignment: this project is connected through implication links; review the evidence before funding.'
}

function ContentFundingCardDetails({ info }: { info: ContentFundingInfo }) {
  const channelDisplayLabels = getChannelDisplayLabels(info.channelCanonicalId, info.channelDisplayMetadata)
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
              {channelDisplayLabels.primary}
            </Typography>
            {channelDisplayLabels.secondary && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {channelDisplayLabels.secondary}
              </Typography>
            )}
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
        {info.contentItemCount > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary">Content Items</Typography>
            <Typography variant="body2">{info.contentItemCount}</Typography>
          </Box>
        )}
      </Stack>
    </Box>
  )
}

export function AlignedProjectCard({
  project,
  metadata,
  causeCid,
}: {
  project: AlignedProject
  metadata: ProjectMetadata | undefined
  causeCid?: string
}) {
  const status = getProjectStatus(project)
  const hasMinimum = BigInt(project.threshold) > 0n
  const fundingProgress = hasMinimum
    ? Number((BigInt(project.totalReceived) * 10000n) / BigInt(project.threshold)) / 100
    : 0
  const progressPercent = Math.min(fundingProgress, 100)

  const contentFundingInfo = useContentFundingInfo(project.projectAddress)

  const lazyGivingPath = projectPathForAddress(project.projectAddress)
  const causeParam = causeCid ? `?causeCid=${encodeURIComponent(causeCid)}` : ''
  const projectHref = getDomainUrl('lazyGiving', lazyGivingPath, { fallbackHref: lazyGivingPath })
  const vouchHref = getDomainUrl('lazyGiving', `${lazyGivingPath}${causeParam}`, { fallbackHref: `${lazyGivingPath}${causeParam}` })

  return (
    <Card>
      <CardActionArea component="a" href={projectHref} aria-label={`Open project on LazyGiving: ${metadata?.name || project.projectAddress}`}>
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
                aria-label={alignmentExplanation(project.alignmentType)}
              />
              <Chip label={STATUS_LABELS[status]} color={STATUS_COLORS[status]} size="small" />
              <Chip label={formatRelativeDeadline(project.deadline)} size="small" variant="outlined" />
            </Stack>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {alignmentExplanation(project.alignmentType)}
          </Typography>

          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {formatCurrencyProgress(project.totalReceived, project.threshold, project.fundingCurrency)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {hasMinimum ? `${Math.round(fundingProgress)}%` : 'No minimum'}
              </Typography>
            </Box>
            {hasMinimum && (
              <LinearProgress
                variant="determinate"
                value={progressPercent}
                sx={{ height: 8, borderRadius: 4 }}
              />
            )}
          </Box>

          {contentFundingInfo && <ContentFundingCardDetails info={contentFundingInfo} />}

          <Button component="span" size="small" variant="contained" sx={{ mt: 2 }}>
            Fund on LazyGiving
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Pledge, refund, and withdraw on LazyGiving — then return here to explore more aligned projects.
          </Typography>
        </CardContent>
      </CardActionArea>
      <CardActions sx={{ pt: 0 }}>
        <Button
          component="a"
          href={vouchHref}
          size="small"
          variant="outlined"
        >
          Vouch for this project
        </Button>
      </CardActions>
    </Card>
  )
}
