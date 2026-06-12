import { useState, useEffect } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { useAccount } from 'wagmi'
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
import {
  getMonthlyPledgedByCause,
  getStatementWithContent,
  getTotalFundingForCause,
  type IpfsCidV1,
} from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
import {
  DEFAULT_PAYMENT_CURRENCY,
  formatCurrencyAmount,
  formatCurrencyTotals,
  getConfiguredPaymentCurrency,
} from '../../shared/currency'
import { useTrustedSet } from '../../shared/hooks/useTrustedSet'
import { useTrustedAttesters } from '../../shared/hooks/useTrustedAttesters'
import { computeAvailableDelegatableFunding } from '../utils'
import { AlignedProjectsList } from '../components/AlignedProjectsList'
import { AttestAlignmentForm } from '../components/AttestAlignmentForm'
import { DelegatableNotesSection } from '../components/DelegatableNotesSection'
import { getDomainUrl } from '../../domains/domainUrls'

export function StatementFundingPortalPage() {
  const { statementCid } = useParams<{ statementCid: string }>()
  const machinery = useMachinery()
  const { address } = useAccount()
  const trustedImplicationAttesters = useTrustedAttesters()
  const activeTrustedImplicationAttesters = trustedImplicationAttesters.length > 0 ? trustedImplicationAttesters : undefined
  const { trustedSet, isLoading: trustedSetLoading } = useTrustedSet(address)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [totalRaised, setTotalRaised] = useState<Awaited<ReturnType<typeof getTotalFundingForCause>>['totalRaisedAcrossProjects']>([])
  const [availableDelegatable, setAvailableDelegatable] = useState<Awaited<ReturnType<typeof computeAvailableDelegatableFunding>>>([])
  const [monthlyPledged, setMonthlyPledged] = useState<bigint>(0n)
  const [projectCount, setProjectCount] = useState<number>(0)

  useEffect(() => {
    if (!statementCid) return
    const cid: string = statementCid
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [stmtResult, fundingMetrics] = await Promise.all([
          getStatementWithContent(machinery, cid as IpfsCidV1),
          getTotalFundingForCause(machinery, cid as IpfsCidV1, activeTrustedImplicationAttesters, trustedSet),
        ])

        if (cancelled) return

        if (stmtResult) {
          const t =
            stmtResult.statement.title ??
            (stmtResult.content?.content
              ? stmtResult.content.content.split('\n')[0].replace(/^#+\s*/, '').trim()
              : null) ??
            `Statement ${cid.slice(0, 12)}...`
          setTitle(t)
          setSummary(stmtResult.statement.excerpt ?? null)
        }

        setTotalRaised(fundingMetrics.totalRaisedAcrossProjects)
        setProjectCount(fundingMetrics.projectCount)

        const [total, monthlyTotals] = await Promise.all([
          computeAvailableDelegatableFunding(machinery, cid),
          machinery.contractAddresses?.recurringPledges
            ? getMonthlyPledgedByCause(machinery)
            : Promise.resolve(new Map<string, bigint>()),
        ])
        if (cancelled) return
        setAvailableDelegatable(total)
        setMonthlyPledged(monthlyTotals.get(cid) ?? 0n)
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading cause board:', err)
          setError(err instanceof Error ? err.message : 'Failed to load cause board')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [machinery, statementCid, activeTrustedImplicationAttesters, trustedSet])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>
  }

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Button component="a" href={getDomainUrl('tally', `/statement/${statementCid}`, { fallbackHref: `/statement/${statementCid}` })} size="small">
            ← Back to Statement on Tally
          </Button>
          <Button
            component={RouterLink}
            to={`/portal/${statementCid}/leaderboard`}
            size="small"
            variant="outlined"
          >
            View Leaderboard
          </Button>
        </Stack>

        <Typography variant="h4" component="h1" gutterBottom>
          Cause Board
        </Typography>

        {title && (
          <Typography variant="h5" gutterBottom>
            {title}
          </Typography>
        )}

        {summary && (
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {summary}
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" spacing={4} flexWrap="wrap">
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Total Funding Raised
            </Typography>
            <Typography variant="h6">{formatCurrencyTotals(totalRaised)}</Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Ongoing Monthly Pledges
            </Typography>
            <Typography variant="h6">
              {formatCurrencyAmount(monthlyPledged, getConfiguredPaymentCurrency() ?? DEFAULT_PAYMENT_CURRENCY)}/month
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Funds from Delegates
            </Typography>
            <Typography variant="h6">{formatCurrencyTotals(availableDelegatable)}</Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Projects
            </Typography>
            <Typography variant="h6">{projectCount}</Typography>
          </Box>
        </Stack>
      </Paper>

      {address && trustedSetLoading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {trustedSet
            ? `Refreshing your trust network. This portal is currently filtered using ${trustedSet.size} account${trustedSet.size !== 1 ? 's' : ''} in your network. Results may still change as more are discovered.`
            : 'Refreshing your trust network. Until any trusted accounts are found, this portal still shows all project endorsements.'}
        </Alert>
      )}

      {/* Aligned Projects */}
      <AlignedProjectsList
        statementCid={statementCid!}
        trustedImplicationAttesters={activeTrustedImplicationAttesters}
        trustedAlignmentAttesters={trustedSet}
      />

      {/* Attest Project Alignment */}
      <AttestAlignmentForm statementCid={statementCid!} />

      {/* Available Delegatable Notes */}
      <DelegatableNotesSection statementCid={statementCid!} />
    </Box>
  )
}
