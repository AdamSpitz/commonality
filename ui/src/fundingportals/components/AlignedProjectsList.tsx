import { useState, useEffect, useMemo } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useAccount } from 'wagmi'
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Button,
} from '@mui/material'
import SortIcon from '@mui/icons-material/Sort'
import { getAllAlignedProjectsForCause } from '@commonality/sdk/fundingportals'
import { getProject } from '@commonality/sdk/lazy-giving'
import { ETH_CURRENCY, type IpfsCidV1 } from '@commonality/sdk/utils'
import {
  boardSnapshotCacheOptions,
  getDomainUrl,
  isDomainConfigured,
  loadAlignedListSnapshot,
  loadProjectWithCache,
  projectFoldCacheOptions,
  saveAlignedListSnapshot,
  useMachinery,
  useTrustedContentAttesters,
  useTrustedSet,
  TrustNetworkRefreshIndicator,
} from '../../shared'
import { selectAlignedContentContracts, useContentFundingState } from '../../content-funding'
import { getProjectStatus } from '../../lazy-giving'
import {
  AlignedProjectCard,
  type AlignedProject,
  type ProjectLinkMode,
  type ProjectMetadata,
} from './AlignedProjectCard'
import { DISCOVERY_LEVEL_MAX_HOPS } from './discoveryLevels'
import { useDiscoveryLevel } from '../hooks/useDiscoveryLevel'
import { useAlignmentFilter } from '../hooks/useAlignmentFilter'
import { readProjectMetadata } from './projectMetadata'
import { resolveStatementCids } from './statementCids'
import { useKeepPaintedWhileRefreshing } from '../hooks/useKeepPaintedWhileRefreshing'

type StatusFilter = 'all' | 'active' | 'succeeded' | 'refunding'
type SortOption = 'latest' | 'deadline' | 'mostFunded' | 'closestToGoal'

const STATUS_HEADINGS: Record<Exclude<StatusFilter, 'all'>, string> = {
  active: 'Projects still raising',
  succeeded: 'Succeeded projects',
  refunding: 'Failed projects',
}

function dedupeProjectsForDisplay(projects: AlignedProject[]): AlignedProject[] {
  const byAddress = new Map<string, AlignedProject>()

  for (const project of projects) {
    const key = project.projectAddress.toLowerCase()
    const existing = byAddress.get(key)
    if (!existing || (existing.alignmentType === 'indirect' && project.alignmentType === 'direct')) {
      byAddress.set(key, project)
    }
  }

  return [...byAddress.values()]
}

export function AlignedProjectsList({
  statementCid,
  statementCids,
  trustedImplicationAttesters,
  trustedAlignmentAttesters,
  projectLinks = 'lazyGiving',
  statusFilterLock,
  embedded = false,
  compact = false,
  limit,
  fullPageTo,
}: {
  statementCid: string
  statementCids?: string[]
  trustedImplicationAttesters?: Iterable<string>
  trustedAlignmentAttesters?: Iterable<string>
  projectLinks?: ProjectLinkMode
  /** When set, only this status is shown and the status toggles are hidden. */
  statusFilterLock?: Exclude<StatusFilter, 'all'>
  /** Flatten heading/paper chrome when nested in the cause-board card. */
  embedded?: boolean
  /** Teaser density: hide sort/status chrome and shrink cards. */
  compact?: boolean
  /** Cap how many cards to show (home preview). */
  limit?: number
  /** In-app path for “See all” when {@link compact} or {@link limit} is set. */
  fullPageTo?: string
}) {
  const cids = resolveStatementCids(statementCid, statementCids)
  const cidsKey = cids.join('\0')
  const machinery = useMachinery()
  const { address } = useAccount()
  const { channels, contentAttestations } = useContentFundingState()
  const trustedContentAttesters = useTrustedContentAttesters()
  const contentTrustKey = trustedContentAttesters
    .map((entry) => entry.address.toLowerCase())
    .sort()
    .join('\0')
  const contentAttestationsKey = [...contentAttestations.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, list]) => `${id}:${list.map((row) => `${row.attested ? 1 : 0}:${row.statementCid}:${row.attester.toLowerCase()}`).sort().join(',')}`)
    .join('|')
  const [discoveryLevel] = useDiscoveryLevel()
  const [alignmentFilter] = useAlignmentFilter()
  const maxHops = DISCOVERY_LEVEL_MAX_HOPS[discoveryLevel]
  const { trustedSet, isLoading: trustedSetLoading } = useTrustedSet(address, { maxHops })
  const activeTrustedAlignmentAttesters = useMemo(() => {
    const base = trustedAlignmentAttesters ?? (discoveryLevel === 'anyone' ? undefined : trustedSet)
    if (!address || !base) return base
    const next = new Set([...base].map((entry) => entry.toLowerCase()))
    next.add(address.toLowerCase())
    return next
  }, [trustedAlignmentAttesters, trustedSet, discoveryLevel, address])
  const implicationTrustKey = useMemo(() => {
    if (!trustedImplicationAttesters) return ''
    return [...trustedImplicationAttesters].map((a) => a.toLowerCase()).sort().join(',')
  }, [trustedImplicationAttesters])
  const alignmentTrustKey = useMemo(() => {
    if (!activeTrustedAlignmentAttesters) return ''
    return [...activeTrustedAlignmentAttesters].map((a) => a.toLowerCase()).sort().join(',')
  }, [activeTrustedAlignmentAttesters])

  const [projects, setProjects] = useState<AlignedProject[]>([])
  const [metadata, setMetadata] = useState<Record<string, ProjectMetadata>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('latest')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(statusFilterLock ?? 'all')
  const keepPainted = useKeepPaintedWhileRefreshing()

  useEffect(() => {
    let cancelled = false
    const loadCids = cidsKey ? cidsKey.split('\0').filter(Boolean) : []
    const snapshotOptions = boardSnapshotCacheOptions(machinery, {
      kind: 'aligned-list',
      statementCids: loadCids,
      implicationTrustKey,
      alignmentTrustKey,
      contentTrustKey,
    })

    async function load() {
      const cached = snapshotOptions
        ? await loadAlignedListSnapshot(snapshotOptions)
        : null
      if (cancelled) return
      if (cached) {
        setProjects(cached.projects as AlignedProject[])
        setMetadata(cached.metadata as Record<string, ProjectMetadata>)
        keepPainted.markResolved()
        setLoading(false)
        setRefreshing(true)
      } else {
        keepPainted.beginLoad(setLoading)
        setRefreshing(false)
      }
      setError(null)
      try {
        const implicationForLoad = implicationTrustKey
          ? implicationTrustKey.split(',')
          : undefined
        const alignmentForLoad = alignmentTrustKey
          ? new Set(alignmentTrustKey.split(','))
          : undefined
        const perPlank = await Promise.all(
          loadCids.map((cid) =>
            getAllAlignedProjectsForCause(
              machinery,
              cid as IpfsCidV1,
              implicationForLoad,
              alignmentForLoad,
            ),
          ),
        )
        const aligned = perPlank.flat()
        if (cancelled) return

        const contentRows = selectAlignedContentContracts(
          channels,
          contentAttestations,
          loadCids,
          contentTrustKey ? contentTrustKey.split('\0') : undefined,
        ).map((contract) => ({
          projectAddress: contract.contractAddress,
          alignmentType: 'direct' as const,
          fundingCurrency: contract.fundingCurrency ?? ETH_CURRENCY,
          totalReceived: contract.totalReceived,
          threshold: contract.threshold,
          deadline: contract.deadline,
        }))

        const displayed = dedupeProjectsForDisplay([...aligned, ...contentRows])
        setProjects(displayed)

        // Load metadata for every displayed row, including content-funding
        // contracts that never appear in the aligned-project query.
        const projectCacheOptions = projectFoldCacheOptions(machinery)
        const metadataEntries = await Promise.all(
          displayed.map(async (p) => {
            const fullProject = projectCacheOptions
              ? await loadProjectWithCache(machinery, p.projectAddress, projectCacheOptions).catch(() => null)
              : await getProject(machinery, p.projectAddress).catch(() => null)
            if (!fullProject?.metadataCid) return [p.projectAddress, null] as const
            const data = await readProjectMetadata(machinery, fullProject.metadataCid as IpfsCidV1).catch(() => null)
            return [p.projectAddress, data] as const
          })
        )
        if (cancelled) return

        const newMetadata: Record<string, ProjectMetadata> = {}
        for (const [addr, data] of metadataEntries) {
          if (data) newMetadata[addr] = data
        }
        setMetadata(newMetadata)
        if (snapshotOptions) {
          await saveAlignedListSnapshot(snapshotOptions, {
            projects: displayed,
            metadata: newMetadata,
          })
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading aligned projects:', err)
          if (!cached) {
            setError(err instanceof Error ? err.message : 'Failed to load aligned projects')
          }
        }
      } finally {
        if (!cancelled) {
          keepPainted.markResolved()
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [
    machinery,
    cidsKey,
    implicationTrustKey,
    alignmentTrustKey,
    channels.length,
    contentAttestationsKey,
    contentTrustKey,
  ])

  const effectiveStatus = statusFilterLock ?? statusFilter
  const filtered = projects
    .filter(p => effectiveStatus === 'all' || getProjectStatus(p) === effectiveStatus)
    .filter(p => alignmentFilter === 'all' || p.alignmentType === alignmentFilter)

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'deadline':
        return Number(a.deadline) - Number(b.deadline)
      case 'mostFunded':
        return BigInt(b.totalReceived) > BigInt(a.totalReceived) ? 1 : -1
      case 'closestToGoal': {
        const progressA = BigInt(a.threshold) > 0n
          ? Number((BigInt(a.totalReceived) * 10000n) / BigInt(a.threshold))
          : 0
        const progressB = BigInt(b.threshold) > 0n
          ? Number((BigInt(b.totalReceived) * 10000n) / BigInt(b.threshold))
          : 0
        return progressB - progressA
      }
      case 'latest':
      default:
        return Number(b.deadline) - Number(a.deadline)
    }
  })
  const visible = limit != null ? sorted.slice(0, limit) : sorted
  const hiddenCount = limit != null ? Math.max(0, sorted.length - limit) : 0

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
  }

  return (
    <Box sx={{ position: 'relative' }}>
      {!embedded && (
        <Typography variant="h5" gutterBottom>
          {statusFilterLock ? STATUS_HEADINGS[statusFilterLock] : 'Aligned Projects'}
        </Typography>
      )}

      {(refreshing || (address && trustedSetLoading && trustedAlignmentAttesters === undefined)) && (
        <TrustNetworkRefreshIndicator
          title={
            address && trustedSetLoading && trustedAlignmentAttesters === undefined
              ? (
                trustedSet
                  ? `Refreshing your trust network. Alignment vouches are currently filtered using ${trustedSet.size} account${trustedSet.size !== 1 ? 's' : ''} in your network. Results may still change as more are discovered.`
                  : 'Refreshing your trust network. Until any trusted accounts are found, alignment vouches are not filtered.'
              )
              : 'Updating aligned projects from the latest events.'
          }
        />
      )}

      {!compact && (
      <Paper
        elevation={embedded ? 0 : 1}
        sx={{
          p: embedded ? 0 : 2,
          mb: embedded ? 1.5 : 3,
          bgcolor: embedded ? 'transparent' : undefined,
        }}
      >
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <SortIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">Sort:</Typography>
            <ToggleButtonGroup
              value={sortBy}
              exclusive
              onChange={(_, v) => v && setSortBy(v)}
              size="small"
            >
              <ToggleButton value="latest">Latest</ToggleButton>
              <ToggleButton value="deadline">Deadline</ToggleButton>
              <ToggleButton value="mostFunded">Most Funded</ToggleButton>
              <ToggleButton value="closestToGoal">Closest to Goal</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {!statusFilterLock && (
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="body2" color="text.secondary">Status:</Typography>
            <ToggleButtonGroup
              value={statusFilter}
              exclusive
              onChange={(_, v) => v && setStatusFilter(v)}
              size="small"
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="active">Funding</ToggleButton>
              <ToggleButton value="succeeded">Succeeded</ToggleButton>
              <ToggleButton value="refunding">Refunding</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          )}
        </Stack>
      </Paper>
      )}

      {sorted.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            {projects.length === 0
              ? (fullPageTo
                ? 'No aligned projects on the statements you have signed yet.'
                : 'No aligned projects yet. Create one for this cause to get started.')
              : 'No projects match the current filters.'}
          </Typography>
          {projects.length === 0 && (
            projectLinks === 'local' ? (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="center" sx={{ mt: 2 }}>
                <Button
                  component={RouterLink}
                  to="/projects/new"
                  variant="contained"
                >
                  Create a project
                </Button>
              </Stack>
            ) : isDomainConfigured('lazyGiving') ? (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="center" sx={{ mt: 2 }}>
                <Button
                  component="a"
                  href={getDomainUrl('lazyGiving', '/projects/new')}
                  variant="contained"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Create a project
                </Button>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Configure VITE_LAZYGIVING_URL to create a project for this cause.
              </Typography>
            )
          )}
        </Paper>
      ) : (
        <Stack spacing={compact ? 1 : 2}>
          {visible.map((project) => (
            <AlignedProjectCard
              key={project.projectAddress}
              project={project}
              metadata={metadata[project.projectAddress]}
              causeCid={statementCid}
              projectLinks={projectLinks}
              compact={compact}
            />
          ))}
          {fullPageTo && (compact || hiddenCount > 0) && (
            <Button
              component={RouterLink}
              to={fullPageTo}
              variant="text"
              sx={{ textTransform: 'none', alignSelf: 'flex-start', px: 0 }}
              data-testid="aligned-projects-see-all"
            >
              {hiddenCount > 0
                ? `See all ${sorted.length} projects`
                : 'See all fundable projects'}
            </Button>
          )}
        </Stack>
      )}
    </Box>
  )
}
