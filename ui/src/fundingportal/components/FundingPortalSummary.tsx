import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  Button,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import {
  getTotalFundingForCause,
  getAllAlignedProjectsForCause,
  getProject,
  fetchFromIPFS,
  type IpfsCidV1,
} from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { formatCurrencyTotals } from '../../shared/currency'
import { computeAvailableDelegatableFunding } from '../utils'
import { AlignedProjectCard, type AlignedProject, type ProjectMetadata } from './AlignedProjectCard'

export function FundingPortalSummary({
  statementCid,
  trustedAlignmentAttesters,
}: {
  statementCid: string
  trustedAlignmentAttesters?: Iterable<string>
}) {
  const machinery = useMachinery()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalRaised, setTotalRaised] = useState<Awaited<ReturnType<typeof getTotalFundingForCause>>['totalRaisedAcrossProjects']>([])
  const [availableDelegatable, setAvailableDelegatable] = useState<Awaited<ReturnType<typeof computeAvailableDelegatableFunding>>>([])
  const [projectCount, setProjectCount] = useState<number>(0)
  const [topProjects, setTopProjects] = useState<AlignedProject[]>([])
  const [metadata, setMetadata] = useState<Record<string, ProjectMetadata>>({})

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [fundingMetrics, allProjects] = await Promise.all([
          getTotalFundingForCause(machinery, statementCid as IpfsCidV1, undefined, trustedAlignmentAttesters),
          getAllAlignedProjectsForCause(machinery, statementCid as IpfsCidV1, undefined, trustedAlignmentAttesters),
        ])
        if (cancelled) return

        setTotalRaised(fundingMetrics.totalRaisedAcrossProjects)
        setProjectCount(fundingMetrics.projectCount)

        // Sort by funding progress and take top 3
        const sorted = [...allProjects].sort((a, b) => {
          const progressA =
            BigInt(a.threshold) > 0n
              ? Number((BigInt(a.totalReceived) * 10000n) / BigInt(a.threshold))
              : 0
          const progressB =
            BigInt(b.threshold) > 0n
              ? Number((BigInt(b.totalReceived) * 10000n) / BigInt(b.threshold))
              : 0
          return progressB - progressA
        })
        const top3 = sorted.slice(0, 3)
        setTopProjects(top3)

        // Fetch IPFS metadata for top 3 projects
        const ipfsConfig = { gatewayUrl: import.meta.env.VITE_IPFS_GATEWAY }
        const metadataEntries = await Promise.all(
          top3.map(async (p) => {
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

        const total = await computeAvailableDelegatableFunding(machinery, statementCid)
        if (cancelled) return
        setAvailableDelegatable(total)
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading funding portal summary:', err)
          setError(err instanceof Error ? err.message : 'Failed to load funding portal summary')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [machinery, statementCid, trustedAlignmentAttesters])

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
    <Box sx={{ mb: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">Funding Portal</Typography>
          <Button
            component={RouterLink}
            to={`/portal/${statementCid}`}
            variant="outlined"
            size="small"
          >
            View Funding Portal
          </Button>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Stack direction="row" spacing={4} flexWrap="wrap" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Total Funding Raised
            </Typography>
            <Typography variant="h6">{formatCurrencyTotals(totalRaised)}</Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Available Delegatable Funding
            </Typography>
            <Typography variant="h6">{formatCurrencyTotals(availableDelegatable)}</Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Aligned Projects
            </Typography>
            <Typography variant="h6">{projectCount}</Typography>
          </Box>
        </Stack>

        {topProjects.length > 0 && (
          <>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Top Projects by Funding Progress
            </Typography>
            <Stack spacing={1}>
              {topProjects.map((project) => (
                <AlignedProjectCard
                  key={project.projectAddress}
                  project={project}
                  metadata={metadata[project.projectAddress]}
                />
              ))}
            </Stack>
          </>
        )}
      </Paper>
    </Box>
  )
}
