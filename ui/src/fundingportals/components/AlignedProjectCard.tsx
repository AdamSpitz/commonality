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
import { Link as RouterLink } from 'react-router-dom'
import { getDomainUrl } from '../../shared'
import type { Currency } from '@commonality/sdk/utils'
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

/** Where project detail links resolve. `local` = same-origin /projects/...; `lazyGiving` = cross-domain LazyGiving. */
export type ProjectLinkMode = 'local' | 'lazyGiving'

/** Discriminated project navigation target so callers cannot misuse path strings as external hrefs. */
export type ProjectNavTarget =
  | { kind: 'route'; to: string }
  | { kind: 'external'; href: string }

/**
 * Resolve a project path for navigation.
 * - `local`: in-app React Router route (works with BrowserRouter and HashRouter).
 * - `lazyGiving`: absolute/cross-domain LazyGiving URL.
 */
export function resolveProjectNav(projectPath: string, mode: ProjectLinkMode = 'lazyGiving'): ProjectNavTarget {
  if (mode === 'local') return { kind: 'route', to: projectPath }
  return {
    kind: 'external',
    href: getDomainUrl('lazyGiving', projectPath, { fallbackHref: projectPath }),
  }
}

/** @deprecated Prefer {@link resolveProjectNav}; kept for callers that only need a string href in lazyGiving mode. */
export function resolveProjectHref(projectPath: string, mode: ProjectLinkMode = 'lazyGiving'): string {
  const nav = resolveProjectNav(projectPath, mode)
  return nav.kind === 'route' ? nav.to : nav.href
}

export function AlignedProjectCard({
  project,
  metadata,
  causeCid,
  projectLinks = 'lazyGiving',
}: {
  project: AlignedProject
  metadata: ProjectMetadata | undefined
  causeCid?: string
  projectLinks?: ProjectLinkMode
}) {
  const status = getProjectStatus(project)
  const hasMinimum = BigInt(project.threshold) > 0n
  const fundingProgress = hasMinimum
    ? Number((BigInt(project.totalReceived) * 10000n) / BigInt(project.threshold)) / 100
    : 0
  const progressPercent = Math.min(fundingProgress, 100)

  const contentFundingInfo = useContentFundingInfo(project.projectAddress)

  const projectPath = projectPathForAddress(project.projectAddress)
  const causeParam = causeCid ? `?causeCid=${encodeURIComponent(causeCid)}` : ''
  const projectNav = resolveProjectNav(projectPath, projectLinks)
  const vouchNav = resolveProjectNav(`${projectPath}${causeParam}`, projectLinks)
  const projectLabel = metadata?.name || project.projectAddress
  const openAriaLabel =
    projectLinks === 'local'
      ? `Open project: ${projectLabel}`
      : `Open project on LazyGiving: ${projectLabel}`

  return (
    <Card>
      {projectNav.kind === 'route' ? (
        <CardActionArea
          component={RouterLink}
          to={projectNav.to}
          aria-label={openAriaLabel}
        >
          <AlignedProjectCardBody
            project={project}
            metadata={metadata}
            status={status}
            hasMinimum={hasMinimum}
            fundingProgress={fundingProgress}
            progressPercent={progressPercent}
            contentFundingInfo={contentFundingInfo}
            projectLinks={projectLinks}
          />
        </CardActionArea>
      ) : (
        <CardActionArea
          component="a"
          href={projectNav.href}
          aria-label={openAriaLabel}
        >
          <AlignedProjectCardBody
            project={project}
            metadata={metadata}
            status={status}
            hasMinimum={hasMinimum}
            fundingProgress={fundingProgress}
            progressPercent={progressPercent}
            contentFundingInfo={contentFundingInfo}
            projectLinks={projectLinks}
          />
        </CardActionArea>
      )}
      <CardActions sx={{ pt: 0 }}>
        {vouchNav.kind === 'route' ? (
          <Button
            component={RouterLink}
            to={vouchNav.to}
            size="small"
            variant="outlined"
          >
            Vouch for this project
          </Button>
        ) : (
          <Button
            component="a"
            href={vouchNav.href}
            size="small"
            variant="outlined"
          >
            Vouch for this project
          </Button>
        )}
      </CardActions>
    </Card>
  )
}

function AlignedProjectCardBody({
  project,
  metadata,
  status,
  hasMinimum,
  fundingProgress,
  progressPercent,
  contentFundingInfo,
  projectLinks,
}: {
  project: AlignedProject
  metadata: ProjectMetadata | undefined
  status: ReturnType<typeof getProjectStatus>
  hasMinimum: boolean
  fundingProgress: number
  progressPercent: number
  contentFundingInfo: ContentFundingInfo | null
  projectLinks: ProjectLinkMode
}) {
  return (
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
        {projectLinks === 'local' ? 'Fund this project' : 'Fund on LazyGiving'}
      </Button>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        {projectLinks === 'local'
          ? 'Contribute, refund, and withdraw here — then return to explore more aligned projects.'
          : 'Contribute, refund, and withdraw on LazyGiving — then return here to explore more aligned projects.'}
      </Typography>
    </CardContent>
  )
}
