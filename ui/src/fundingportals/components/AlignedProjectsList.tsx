import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material'
import SortIcon from '@mui/icons-material/Sort'
import {
  getAllAlignedProjectsForCause,
  getProject,
  fetchFromIPFS,
  type IpfsCidV1,
} from '@commonality/sdk'
import { useMachinery } from '../../shared'
import { getProjectStatus } from '../../lazy-giving'
import { AlignedProjectCard, type AlignedProject, type ProjectMetadata } from './AlignedProjectCard'

type StatusFilter = 'all' | 'active' | 'succeeded' | 'refunding'
type AlignmentFilter = 'all' | 'direct' | 'indirect'
type SortOption = 'latest' | 'deadline' | 'mostFunded' | 'closestToGoal'

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
  trustedImplicationAttesters,
  trustedAlignmentAttesters,
}: {
  statementCid: string
  trustedImplicationAttesters?: Iterable<string>
  trustedAlignmentAttesters?: Iterable<string>
}) {
  const machinery = useMachinery()
  const [projects, setProjects] = useState<AlignedProject[]>([])
  const [metadata, setMetadata] = useState<Record<string, ProjectMetadata>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('latest')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [alignmentFilter, setAlignmentFilter] = useState<AlignmentFilter>('all')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const aligned = await getAllAlignedProjectsForCause(
          machinery,
          statementCid as IpfsCidV1,
          trustedImplicationAttesters,
          trustedAlignmentAttesters
        )
        if (cancelled) return

        setProjects(dedupeProjectsForDisplay(aligned))

        // Fetch IPFS metadata for each project
        const ipfsConfig = { gatewayUrl: import.meta.env.VITE_IPFS_GATEWAY }
        const metadataEntries = await Promise.all(
          aligned.map(async (p) => {
            const fullProject = await getProject(machinery, p.projectAddress).catch(() => null)
            if (!fullProject?.metadataCid) return [p.projectAddress, null] as const
            const data = await fetchFromIPFS(ipfsConfig, fullProject.metadataCid).catch(() => null)
            return [p.projectAddress, data as ProjectMetadata | null] as const
          })
        )
        if (cancelled) return

        const newMetadata: Record<string, ProjectMetadata> = {}
        for (const [addr, data] of metadataEntries) {
          if (data) newMetadata[addr] = data
        }
        setMetadata(newMetadata)
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading aligned projects:', err)
          setError(err instanceof Error ? err.message : 'Failed to load aligned projects')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [machinery, statementCid, trustedImplicationAttesters, trustedAlignmentAttesters])

  const filtered = projects
    .filter(p => statusFilter === 'all' || getProjectStatus(p) === statusFilter)
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
    <Box>
      <Typography variant="h5" gutterBottom>
        Aligned Projects
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
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

          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="body2" color="text.secondary">Alignment:</Typography>
            <ToggleButtonGroup
              value={alignmentFilter}
              exclusive
              onChange={(_, v) => v && setAlignmentFilter(v)}
              size="small"
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="direct">Direct</ToggleButton>
              <ToggleButton value="indirect">Indirect</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>
      </Paper>

      {sorted.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            {projects.length === 0
              ? 'No aligned projects yet.'
              : 'No projects match the current filters.'}
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {sorted.map((project) => (
            <AlignedProjectCard
              key={project.projectAddress}
              project={project}
              metadata={metadata[project.projectAddress]}
              causeCid={statementCid}
            />
          ))}
        </Stack>
      )}
    </Box>
  )
}
