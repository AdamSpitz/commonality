import { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Stack,
  LinearProgress,
  Button,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import SortIcon from '@mui/icons-material/Sort'
import type { ProjectWithMetrics, ProjectSortField } from '@commonality/sdk/lazy-giving'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { getEventCacheUrl, useCachedProjects, useMachinery } from '../../shared'
import { formatCurrencyAmountWithLocalEstimate, formatCurrencyProgress } from '../../shared'
import { getProjectStatus, STATUS_COLORS, STATUS_LABELS, formatRelativeDeadline } from '../utils'
import { getRuntimeConfigValue, loadDisplayDenylist } from '../../shared'
import { projectPathForAddress } from '../../shared'
import { readLazyGivingProjectMetadata, type ProjectMetadata } from '../metadata'

type StatusFilter = 'all' | 'active' | 'succeeded' | 'refunding'

type SortOption = 'newest' | 'deadline' | 'mostFunded' | 'closestToGoal'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

const SORT_MAP: Record<SortOption, { field: ProjectSortField; direction: 'asc' | 'desc' }> = {
  newest: { field: 'createdAt', direction: 'desc' },
  deadline: { field: 'deadline', direction: 'asc' },
  mostFunded: { field: 'totalReceived', direction: 'desc' },
  closestToGoal: { field: 'fundingProgress', direction: 'desc' },
}

export function BrowseProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithMetrics[]>([])
  const [metadata, setMetadata] = useState<Record<string, ProjectMetadata>>({})
  const [metadataWarning, setMetadataWarning] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const { field, direction } = SORT_MAP[sortBy]
  const machinery = useMachinery()
  const cacheOptions = useMemo(() => ({
    eventCacheUrl: getEventCacheUrl(),
    contractAddresses: {
      assuranceContractFactory: (getRuntimeConfigValue('VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS') ??
        ZERO_ADDRESS) as `0x${string}`,
    },
    foldType: 'project' as const,
  }), [])
  const {
    projects: cachedProjects,
    loading,
    error,
  } = useCachedProjects({
    cacheOptions,
    sortBy: field,
    sortDirection: direction,
  })

  useEffect(() => {
    setProjects(cachedProjects)
  }, [cachedProjects])

  useEffect(() => {
    const loadMetadata = async () => {
      const displayDenylist = await loadDisplayDenylist()
      const metadataEntries = await Promise.all(
        cachedProjects
          .filter(p => p.metadataCid)
          .map(async (p) => {
            try {
              const data = await readLazyGivingProjectMetadata(machinery, p.metadataCid! as IpfsCidV1, displayDenylist)
              return { id: p.id, data, unavailable: !data }
            } catch (err) {
              console.warn('Error loading project metadata:', err)
              return { id: p.id, data: null, unavailable: true }
            }
          })
      )

      const newMetadata: Record<string, ProjectMetadata> = {}
      let missingMetadata = false
      for (const { id, data, unavailable } of metadataEntries) {
        if (data) newMetadata[id] = data
        if (unavailable) missingMetadata = true
      }
      setMetadata(newMetadata)
      setMetadataWarning(missingMetadata
        ? 'Some project metadata could not be loaded from IPFS/PublishedData. Showing on-chain project data where metadata is unavailable.'
        : null)
    }

    loadMetadata().catch((err) => {
      console.error('Error loading project metadata:', err)
    })
  }, [cachedProjects, machinery])

  const handleSortChange = (_: React.MouseEvent<HTMLElement>, newSort: SortOption | null) => {
    if (newSort !== null) setSortBy(newSort)
  }

  const handleFilterChange = (_: React.MouseEvent<HTMLElement>, newFilter: StatusFilter | null) => {
    if (newFilter !== null) setStatusFilter(newFilter)
  }

  const filteredProjects = statusFilter === 'all'
    ? projects
    : projects.filter(p => getProjectStatus(p) === statusFilter)

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Browse Projects
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 680 }}>
        Projects are crowdfunding campaigns backed by assurance contracts: your contribution is fully refundable if the funding goal isn't met. If the project succeeds, your onchain receipt remains non-transferable; later supporters can close the loop by donating into the reimbursement flow.
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            <SortIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              Sort:
            </Typography>
            <ToggleButtonGroup
              value={sortBy}
              exclusive
              onChange={handleSortChange}
              size="small"
              sx={{ flexWrap: 'wrap' }}
            >
              <ToggleButton value="newest">Newest</ToggleButton>
              <ToggleButton value="deadline">Deadline</ToggleButton>
              <ToggleButton value="mostFunded">Most Funded</ToggleButton>
              <ToggleButton value="closestToGoal">Closest to Goal</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Status:
            </Typography>
            <ToggleButtonGroup
              value={statusFilter}
              exclusive
              onChange={handleFilterChange}
              size="small"
              sx={{ flexWrap: 'wrap' }}
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="active">Funding</ToggleButton>
              <ToggleButton value="succeeded">Succeeded</ToggleButton>
              <ToggleButton value="refunding">Refunding</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>
      </Paper>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && !error && metadataWarning && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {metadataWarning}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && filteredProjects.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Stack spacing={2} alignItems="center">
            <Typography variant="body1" color="text.secondary">
              {statusFilter === 'all'
                ? 'No projects found. Be the first to create one!'
                : `No ${STATUS_LABELS[statusFilter]?.toLowerCase() ?? statusFilter} projects found.`}
            </Typography>
            {statusFilter === 'all' && (
              <Button component={RouterLink} to="/projects/new" variant="contained">
                Create a project
              </Button>
            )}
          </Stack>
        </Paper>
      )}

      {!loading && !error && filteredProjects.length > 0 && (
        <Stack spacing={2}>
          {filteredProjects.map((project) => {
            const status = getProjectStatus(project)
            const meta = metadata[project.id]
            const hasMinimum = BigInt(project.threshold) > 0n
            const progressPercent = hasMinimum ? Math.min(project.fundingProgress * 100, 100) : 0

            return (
              <Card key={project.id}>
                <CardActionArea component={RouterLink} to={projectPathForAddress(project.id)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
                        {meta?.name || `Project ${project.id.slice(0, 8)}...`}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ ml: 1 }}>
                        <Chip
                          label={STATUS_LABELS[status]}
                          color={STATUS_COLORS[status]}
                          size="small"
                        />
                        <Chip
                          label={formatRelativeDeadline(project.deadline)}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                    </Box>

                    <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {hasMinimum
                            ? `${formatCurrencyAmountWithLocalEstimate(project.totalReceived, project.fundingCurrency)} / ${formatCurrencyAmountWithLocalEstimate(project.threshold, project.fundingCurrency)}`
                            : formatCurrencyProgress(project.totalReceived, project.threshold, project.fundingCurrency)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {hasMinimum ? `${Math.round(project.fundingProgress * 100)}%` : 'No minimum'}
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
