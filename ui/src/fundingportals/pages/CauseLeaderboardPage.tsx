import { useState, useEffect } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material'
import { useAccount } from 'wagmi'
import { getMonthlyPledgedByCause } from '@commonality/sdk/delegation'
import { getTopContributorsForCause, getTotalFundingForCause, getUserContributionRankForCause, type ContributorStats } from '@commonality/sdk/fundingportals'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { useMachinery } from '../../shared'
import { DEFAULT_PAYMENT_CURRENCY, formatCurrencyAmount, formatCurrencyTotals, getConfiguredPaymentCurrency } from '../../shared'
import { useTrustedSet } from '../../shared'
import { truncateAddress } from '../../shared'

export function CauseLeaderboardPage() {
  const { statementCid } = useParams<{ statementCid: string }>()
  const machinery = useMachinery()
  const { address: userAddress } = useAccount()
  const { trustedSet, isLoading: trustedSetLoading } = useTrustedSet(userAddress)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contributors, setContributors] = useState<ContributorStats[]>([])
  const [delegatedFunds, setDelegatedFunds] = useState<
    Awaited<ReturnType<typeof getTotalFundingForCause>>['totalAvailableFromNotes']
  >([])
  const [monthlyPledged, setMonthlyPledged] = useState<bigint>(0n)
  const [userRank, setUserRank] = useState<{
    rank: number
    stats: ContributorStats | null
    totalContributors: number
  } | null>(null)

  useEffect(() => {
    if (!statementCid) return
    const causeCid = statementCid
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [topContributors, fundingMetrics, monthlyTotals] = await Promise.all([
          getTopContributorsForCause(
            machinery,
            causeCid as IpfsCidV1,
            50,
            undefined,
            trustedSet,
          ),
          getTotalFundingForCause(
            machinery,
            causeCid as IpfsCidV1,
            undefined,
            trustedSet,
          ),
          machinery.contractAddresses?.recurringPledges
            ? getMonthlyPledgedByCause(machinery)
            : Promise.resolve(new Map<string, bigint>()),
        ])
        if (cancelled) return
        setContributors(topContributors)
        setDelegatedFunds(fundingMetrics.totalAvailableFromNotes)
        setMonthlyPledged(monthlyTotals.get(causeCid) ?? 0n)

        if (userAddress) {
          const rankResult = await getUserContributionRankForCause(
            machinery,
            causeCid as IpfsCidV1,
            userAddress,
            undefined,
            trustedSet,
          )
          if (cancelled) return
          setUserRank(rankResult)
        } else {
          setUserRank(null)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading leaderboard:', err)
          setError(err instanceof Error ? err.message : 'Failed to load leaderboard')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [machinery, statementCid, userAddress, trustedSet])

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
      <Box sx={{ mb: 2 }}>
        <Button component={RouterLink} to={`/portal/${statementCid}`} size="small">
          ← Back to Cause Board
        </Button>
      </Box>

      {/* My Rank summary card */}
      {userRank && userRank.stats && userRank.rank > 0 && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'action.hover' }}>
          <Typography variant="h6" gutterBottom>
            Your Rank
          </Typography>
          <Typography variant="body1">
            You are <strong>#{userRank.rank}</strong> direct-purchase contributor to this cause
            {' — '}
            {formatCurrencyTotals(userRank.stats.netContribution)} across{' '}
            {userRank.stats.projectsContributedTo} project
            {userRank.stats.projectsContributedTo !== 1 ? 's' : ''}.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {userRank.totalContributors} total contributor
            {userRank.totalContributors !== 1 ? 's' : ''}
          </Typography>
        </Paper>
      )}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Cause Leaderboard
        </Typography>

        {userAddress && trustedSetLoading && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {trustedSet
              ? `Refreshing your trust network. This leaderboard is currently using ${trustedSet.size} account${trustedSet.size !== 1 ? 's' : ''} in your network. Results may still change as more are discovered.`
              : 'Refreshing your trust network. Until any trusted accounts are found, this leaderboard still includes all alignment attestations.'}
          </Alert>
        )}

        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Available in Delegated Funds
          </Typography>
          <Typography variant="h6">{formatCurrencyTotals(delegatedFunds)}</Typography>
          <Typography variant="body2" color="text.secondary">
            Delegated-note deposits are revocable pledges, so they are shown only as an aggregate and are not ranked per person.
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Ongoing Monthly Pledges
          </Typography>
          <Typography variant="h6">
            {formatCurrencyAmount(monthlyPledged, getConfiguredPaymentCurrency() ?? DEFAULT_PAYMENT_CURRENCY)}/month
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Active standing pledges are ongoing commitments and are not ranked with one-time project purchases.
          </Typography>
        </Paper>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This leaderboard ranks direct project purchases only.
        </Typography>

        {contributors.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No direct project purchases yet.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell align="right">Contributed</TableCell>
                  <TableCell align="right">Projects</TableCell>
                  <TableCell align="right">Net</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contributors.map((entry, i) => {
                  const isUser =
                    userAddress &&
                    entry.participant.toLowerCase() === userAddress.toLowerCase()
                  return (
                    <TableRow
                      key={entry.participant}
                      sx={isUser ? { bgcolor: 'action.selected' } : undefined}
                    >
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>
                        <Tooltip title={entry.participant} placement="top">
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.85rem',
                              cursor: 'help',
                            }}
                          >
                            {truncateAddress(entry.participant)}
                            {isUser && ' (you)'}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrencyTotals(entry.totalContributed)}
                      </TableCell>
                      <TableCell align="right">
                        {entry.projectsContributedTo}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrencyTotals(entry.netContribution)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  )
}
