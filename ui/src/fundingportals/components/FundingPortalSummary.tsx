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
import { getMonthlyPledgedByCause } from '@commonality/sdk/delegation'
import { getTotalFundingForCause, getAllAlignedProjectsForCause } from '@commonality/sdk/fundingportals'
import { getProject } from '@commonality/sdk/lazy-giving'
import { type Currency, type IpfsCidV1 } from '@commonality/sdk/utils'
import { useMachinery } from '../../shared'
import { DEFAULT_PAYMENT_CURRENCY, formatCurrencyAmount, formatCurrencyTotals, getConfiguredPaymentCurrency } from '../../shared'
import { computeAvailableDelegatableFunding } from '../utils'
import { AlignedProjectCard, type AlignedProject, type ProjectMetadata } from './AlignedProjectCard'
import { readProjectMetadata } from './projectMetadata'

export function FundingPortalSummary({
  statementCid,
  trustedImplicationAttesters,
  trustedAlignmentAttesters,
}: {
  statementCid: string
  trustedImplicationAttesters?: Iterable<string>
  trustedAlignmentAttesters?: Iterable<string>
}) {
  const machinery = useMachinery()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalRaised, setTotalRaised] = useState<Awaited<ReturnType<typeof getTotalFundingForCause>>['totalRaisedAcrossProjects']>([])
  const [availableDelegatable, setAvailableDelegatable] = useState<Awaited<ReturnType<typeof computeAvailableDelegatableFunding>>>([])
  const [monthlyPledged, setMonthlyPledged] = useState<bigint>(0n)
  const [projectCount, setProjectCount] = useState<number>(0)
  const [topProjects, setTopProjects] = useState<AlignedProject[]>([])
  const [metadata, setMetadata] = useState<Record<string, ProjectMetadata>>({})
  const [portalCurrency, setPortalCurrency] = useState<Currency>(getConfiguredPaymentCurrency() ?? DEFAULT_PAYMENT_CURRENCY)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [fundingMetrics, allProjects] = await Promise.all([
          getTotalFundingForCause(machinery, statementCid as IpfsCidV1, trustedImplicationAttesters, trustedAlignmentAttesters),
          getAllAlignedProjectsForCause(machinery, statementCid as IpfsCidV1, trustedImplicationAttesters, trustedAlignmentAttesters),
        ])
        if (cancelled) return

        setTotalRaised(fundingMetrics.totalRaisedAcrossProjects)
        setProjectCount(fundingMetrics.projectCount)
        const projectFundingCurrency = allProjects.find((project) => project.fundingCurrency)?.fundingCurrency
        setPortalCurrency(fundingMetrics.totalRaisedAcrossProjects[0]?.currency ?? projectFundingCurrency ?? getConfiguredPaymentCurrency() ?? DEFAULT_PAYMENT_CURRENCY)

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

        // Read project display metadata through the CID-first migration seam.
        const metadataEntries = await Promise.all(
          top3.map(async (p) => {
            const fullProject = await getProject(machinery, p.projectAddress).catch(() => null)
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

        const [total, monthlyTotals] = await Promise.all([
          computeAvailableDelegatableFunding(machinery, statementCid),
          machinery.contractAddresses?.recurringPledges
            ? getMonthlyPledgedByCause(machinery)
            : Promise.resolve(new Map<string, bigint>()),
        ])
        if (cancelled) return
        setAvailableDelegatable(total)
        setMonthlyPledged(monthlyTotals.get(statementCid) ?? 0n)
        setPortalCurrency((current) => total[0]?.currency ?? current)
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading cause board summary:', err)
          setError(err instanceof Error ? err.message : 'Failed to load cause board summary')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [machinery, statementCid, trustedImplicationAttesters, trustedAlignmentAttesters])

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
          <Typography variant="h6">Cause Board</Typography>
          <Button
            component={RouterLink}
            to={`/portal/${statementCid}`}
            variant="outlined"
            size="small"
          >
            View Cause Board
          </Button>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Stack direction="row" spacing={4} flexWrap="wrap" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Total Funding Raised
            </Typography>
            <Typography variant="h6">{formatCurrencyTotals(totalRaised, portalCurrency)}</Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Funds from Delegates
            </Typography>
            <Typography variant="h6">{formatCurrencyTotals(availableDelegatable, portalCurrency)}</Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Ongoing Monthly Pledges
            </Typography>
            <Typography variant="h6">{formatCurrencyAmount(monthlyPledged, getConfiguredPaymentCurrency() ?? DEFAULT_PAYMENT_CURRENCY)}/month</Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Projects
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
