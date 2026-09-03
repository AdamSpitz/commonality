import { useState, type MouseEvent } from 'react'
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  Stack,
  LinearProgress,
  Tooltip,
  Menu,
  MenuItem,
} from '@mui/material'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import { Link as RouterLink } from 'react-router-dom'
import { getDomainUrl } from '../../shared'
import type { Currency } from '@commonality/sdk/utils'
import {
  getProjectStatus,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_TOOLTIPS,
  DEADLINE_ENDED_TOOLTIP,
  DEADLINE_OPEN_TOOLTIP,
  formatRelativeDeadline,
} from '../../lazy-giving'
import {
  getChannelDisplayLabels,
  type ChannelDisplayMetadata,
  useContentFundingState,
  FAN_CREATED_TOOLTIP,
  CONTENT_FUNDING_BADGE_TOOLTIP,
  CONTRACT_STATUS_TOOLTIPS,
} from '../../content-funding'
import { formatCurrencyProgress, InfoChip, projectPathForAddress } from '../../shared'
import { formatPlacePath } from './geographicInclusion'

export type AlignedProject = {
  projectAddress: string
  alignmentType: 'direct' | 'indirect'
  fundingCurrency: Currency
  totalReceived: string
  threshold: string
  deadline: string
}

export type ProjectMetadata = { name?: string; description?: string; relevantAreas?: string[][] }

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
      <InfoChip
        label="Content Funding"
        size="small"
        title={CONTENT_FUNDING_BADGE_TOOLTIP}
        sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}
      />
      {info.isThirdParty && (
        <InfoChip label="Fan-created" size="small" variant="outlined" title={FAN_CREATED_TOOLTIP} />
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
    <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
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
          <InfoChip
            label={contractStatusLabels[info.contractStatus]}
            size="small"
            color={info.contractStatus === 'successful' ? 'success' : info.contractStatus === 'active' ? 'primary' : 'default'}
            title={CONTRACT_STATUS_TOOLTIPS[info.contractStatus] ?? 'Status of this funding round.'}
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

/** Card heading: published name, else the content-funding channel, else a short address. */
export function projectSummaryTitle(
  address: string,
  metadata?: ProjectMetadata,
  channelPrimary?: string | null,
): string {
  const name = metadata?.name?.trim() || channelPrimary?.trim()
  if (name) return name
  return `Project ${address.slice(0, 8)}...`
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
  compact = false,
}: {
  project: AlignedProject
  metadata: ProjectMetadata | undefined
  causeCid?: string
  projectLinks?: ProjectLinkMode
  /** Home teaser: smaller title, no content-contract channel block. */
  compact?: boolean
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
  const channelLabels = contentFundingInfo
    ? getChannelDisplayLabels(
      contentFundingInfo.channelCanonicalId,
      contentFundingInfo.channelDisplayMetadata,
    )
    : null
  const titleText = projectSummaryTitle(
    project.projectAddress,
    metadata,
    channelLabels?.primary,
  )
  const openAriaLabel =
    projectLinks === 'local'
      ? `Open project: ${titleText}`
      : `Open project on LazyGiving: ${titleText}`

  const titleSx = {
    fontWeight: 600,
    color: 'inherit',
    textDecoration: 'none',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    '&:hover': { textDecoration: 'underline' },
  } as const

  return (
    <Card>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, '&:last-child': { pb: 2 } }}>
        {projectNav.kind === 'route' ? (
          <Typography
            variant={compact ? 'subtitle1' : 'h6'}
            component={RouterLink}
            to={projectNav.to}
            aria-label={openAriaLabel}
            noWrap
            title={titleText}
            sx={titleSx}
          >
            {titleText}
          </Typography>
        ) : (
          <Typography
            variant={compact ? 'subtitle1' : 'h6'}
            component="a"
            href={projectNav.href}
            aria-label={openAriaLabel}
            noWrap
            title={titleText}
            sx={titleSx}
          >
            {titleText}
          </Typography>
        )}

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {contentFundingInfo && <ContentFundingBadge info={contentFundingInfo} />}
          <AlignmentMenuChip alignmentType={project.alignmentType} vouchNav={vouchNav} />
          <InfoChip
            label={STATUS_LABELS[status]}
            color={STATUS_COLORS[status]}
            size="small"
            title={STATUS_TOOLTIPS[status]}
          />
          <InfoChip
            label={formatRelativeDeadline(project.deadline)}
            size="small"
            variant="outlined"
            title={formatRelativeDeadline(project.deadline) === 'Ended' ? DEADLINE_ENDED_TOOLTIP : DEADLINE_OPEN_TOOLTIP}
          />
          {metadata?.relevantAreas?.map((area) => (
            <InfoChip
              key={area.join('\0')}
              label={formatPlacePath(area)}
              size="small"
              variant="outlined"
              title="Project creator's approximate relevant area; not a verified address or eligibility claim."
            />
          ))}
        </Stack>

        <AlignedProjectCardDetails
          project={project}
          hasMinimum={hasMinimum}
          fundingProgress={fundingProgress}
          progressPercent={progressPercent}
          contentFundingInfo={contentFundingInfo}
          compact={compact}
        />
      </CardContent>
    </Card>
  )
}

function AlignmentMenuChip({
  alignmentType,
  vouchNav,
}: {
  alignmentType: AlignedProject['alignmentType']
  vouchNav: ProjectNavTarget
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)
  const explanation = alignmentExplanation(alignmentType)
  const label = alignmentType === 'direct' ? 'Direct' : 'Indirect'

  const handleChipClick = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
  }

  const handleClose = (event?: object) => {
    if (event && typeof event === 'object' && 'stopPropagation' in event) {
      ;(event as MouseEvent).stopPropagation()
    }
    setAnchorEl(null)
  }

  return (
    <>
      <Tooltip title={explanation}>
        <Chip
          label={label}
          size="small"
          variant="outlined"
          color={alignmentType === 'direct' ? 'primary' : 'default'}
          onClick={handleChipClick}
          icon={<ArrowDropDownIcon />}
          aria-label={explanation}
          aria-haspopup="menu"
          aria-expanded={open ? 'true' : undefined}
          data-testid="alignment-chip"
        />
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        disableScrollLock
      >
        {vouchNav.kind === 'route' ? (
          <MenuItem component={RouterLink} to={vouchNav.to} onClick={() => setAnchorEl(null)}>
            Vouch for this project
          </MenuItem>
        ) : (
          <MenuItem component="a" href={vouchNav.href} onClick={() => setAnchorEl(null)}>
            Vouch for this project
          </MenuItem>
        )}
      </Menu>
    </>
  )
}

function AlignedProjectCardDetails({
  project,
  hasMinimum,
  fundingProgress,
  progressPercent,
  contentFundingInfo,
  compact,
}: {
  project: AlignedProject
  hasMinimum: boolean
  fundingProgress: number
  progressPercent: number
  contentFundingInfo: ContentFundingInfo | null
  compact: boolean
}) {
  return (
    <Box>
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
          sx={{ height: compact ? 4 : 8, borderRadius: 4 }}
        />
      )}
      {contentFundingInfo && !compact && <ContentFundingCardDetails info={contentFundingInfo} />}
    </Box>
  )
}
