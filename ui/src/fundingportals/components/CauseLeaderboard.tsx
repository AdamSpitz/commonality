import { useState, useEffect, useMemo } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { useAccount } from 'wagmi'
import { getStandingPledges, type StandingPledge } from '@commonality/sdk/delegation'
import {
  getTopContributorsForCause,
  getUserContributionRankForCause,
  type ContributorStats,
} from '@commonality/sdk/fundingportals'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import {
  useMachinery,
  DEFAULT_PAYMENT_CURRENCY,
  formatCurrencyAmount,
  formatCurrencyTotals,
  getConfiguredPaymentCurrency,
  useTrustedSet,
  truncateAddress,
  TrustNetworkRefreshIndicator,
} from '../../shared'
import type { CauseBoardNavLink } from './CauseBoard'
import { useKeepPaintedWhileRefreshing } from '../hooks/useKeepPaintedWhileRefreshing'
import { resolveStatementCids } from './statementCids'

function SectionHeading({
  title,
  info,
}: {
  title: string
  info: string
}) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1.5 }}>
      <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Tooltip title={info} placement="top">
        <IconButton
          size="small"
          aria-label={`About ${title}`}
          sx={{ color: 'text.secondary' }}
        >
          <InfoOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  )
}

export interface CauseLeaderboardProps {
  statementCid?: string
  /** Union several statements (a cause's published planks). Deduped by project. */
  statementCids?: string[]
  /**
   * Back navigation. Defaults to Aligning route `/portal/:statementCid`.
   */
  backLink?: CauseBoardNavLink
  /** Cap the ranked table. Full page defaults to 50; preview typically uses 3. */
  limit?: number
  /**
   * Compact section for embedding on a statement/cause page: no back link,
   * monthly-pledge card, or rank card. Shows a section heading and optional
   * “Show more” link to the full leaderboard.
   */
  embedded?: boolean
  /** In-app path for the “Show more” control when {@link embedded}. */
  fullPageTo?: string
}

/**
 * Full cause leaderboard surface. Shared by Aligning and CauseStarter.
 */
export function CauseLeaderboard({
  statementCid,
  statementCids,
  backLink,
  limit,
  embedded = false,
  fullPageTo,
}: CauseLeaderboardProps) {
  const machinery = useMachinery()
  const { address: userAddress } = useAccount()
  const { trustedSet, isLoading: trustedSetLoading } = useTrustedSet(userAddress)
  const loadCids = useMemo(
    () => resolveStatementCids(statementCid, statementCids),
    [statementCid, statementCids],
  )
  const loadCidsKey = loadCids.join(',')
  const trustedSetKey = useMemo(() => {
    if (!trustedSet || trustedSet.size === 0) return ''
    return Array.from(trustedSet)
      .map((a) => a.toLowerCase())
      .sort()
      .join(',')
  }, [trustedSet])
  const keepPainted = useKeepPaintedWhileRefreshing()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contributors, setContributors] = useState<ContributorStats[]>([])
  const [monthlyPledgers, setMonthlyPledgers] = useState<Array<{ owner: string; amount: bigint }>>([])
  const [userRank, setUserRank] = useState<{
    rank: number
    stats: ContributorStats | null
    totalContributors: number
  } | null>(null)

  useEffect(() => {
    const cids = loadCidsKey ? loadCidsKey.split(',') : []
    let cancelled = false

    async function load() {
      if (cids.length === 0) {
        setContributors([])
        setMonthlyPledgers([])
        setUserRank(null)
        setError(null)
        setLoading(false)
        return
      }
      keepPainted.beginLoad(setLoading)
      setError(null)
      try {
        const fetchLimit = limit ?? (embedded ? 3 : 50)
        const trustedSetForLoad: Set<string> | undefined = trustedSetKey
          ? new Set(trustedSetKey.split(','))
          : undefined
        const queryCids = (cids.length === 1 ? cids[0]! : cids) as IpfsCidV1 | IpfsCidV1[]
        const [topContributors, standingPledges] = await Promise.all([
          getTopContributorsForCause(
            machinery,
            queryCids,
            fetchLimit,
            undefined,
            trustedSetForLoad,
          ),
          !embedded && machinery.contractAddresses?.recurringPledges
            ? getStandingPledges(machinery)
            : Promise.resolve([] as StandingPledge[]),
        ])
        if (cancelled) return
        setContributors(topContributors)
        const cidSet = new Set(cids)
        const byOwner = new Map<string, bigint>()
        for (const pledge of standingPledges) {
          if (!pledge.active) continue
          if (!cidSet.has(pledge.causeRef)) continue
          const owner = pledge.rootOwner.toLowerCase()
          byOwner.set(owner, (byOwner.get(owner) ?? 0n) + BigInt(pledge.amountPerPeriod))
        }
        const rankedPledgers = [...byOwner.entries()]
          .map(([owner, amount]) => ({ owner, amount }))
          .sort((a, b) => (a.amount === b.amount ? a.owner.localeCompare(b.owner) : a.amount > b.amount ? -1 : 1))
        setMonthlyPledgers(rankedPledgers)

        if (!embedded && userAddress) {
          const rankResult = await getUserContributionRankForCause(
            machinery,
            queryCids,
            userAddress,
            undefined,
            trustedSetForLoad,
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
        if (!cancelled) {
          keepPainted.markResolved()
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [machinery, loadCidsKey, userAddress, trustedSetKey, limit, embedded])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: embedded ? 3 : 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>
  }

  const resolvedBack: CauseBoardNavLink = backLink ?? {
    label: '← Back to fundable-projects board',
    to: `/portal/${loadCids[0] ?? ''}`,
  }

  const table = contributors.length === 0 ? (
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
              userAddress && entry.contributor.toLowerCase() === userAddress.toLowerCase()
            return (
              <TableRow
                key={entry.contributor}
                sx={isUser ? { bgcolor: 'action.selected' } : undefined}
              >
                <TableCell>{i + 1}</TableCell>
                <TableCell>
                  <Tooltip title={entry.contributor} placement="top">
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        cursor: 'help',
                      }}
                    >
                      {truncateAddress(entry.contributor)}
                      {isUser && ' (you)'}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  {formatCurrencyTotals(entry.totalContributed)}
                </TableCell>
                <TableCell align="right">{entry.projectsContributedTo}</TableCell>
                <TableCell align="right">
                  {formatCurrencyTotals(entry.netContribution)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )

  if (embedded) {
    return (
      <Paper
        elevation={0}
        sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
        data-testid="statement-leaderboard-preview"
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Leaderboard
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, mt: 0.5 }}>
          Top {limit ?? 3} by direct project purchases
          {loadCids.length > 1 ? ' across this cause\'s statements.' : '.'}
        </Typography>
        {table}
        {fullPageTo && (
          <Button
            component={RouterLink}
            to={fullPageTo}
            size="small"
            sx={{ mt: 1.5, textTransform: 'none', fontWeight: 600 }}
          >
            Show more
          </Button>
        )}
      </Paper>
    )
  }

  return (
    <Box sx={{ position: 'relative' }}>
      {userAddress && trustedSetLoading && (
        <TrustNetworkRefreshIndicator
          title={
            trustedSet
              ? `Refreshing your trust network. This leaderboard is currently using ${trustedSet.size} account${trustedSet.size !== 1 ? 's' : ''} in your network. Results may still change as more are discovered.`
              : 'Refreshing your trust network. Until any trusted accounts are found, this leaderboard still includes all alignment attestations.'
          }
        />
      )}
      <Box sx={{ mb: 2 }}>
        {'href' in resolvedBack ? (
          <Button component="a" href={resolvedBack.href} size="small">
            {resolvedBack.label}
          </Button>
        ) : (
          <Button component={RouterLink} to={resolvedBack.to} size="small">
            {resolvedBack.label}
          </Button>
        )}
      </Box>

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

      <Typography variant="h4" component="h1" gutterBottom>
        Cause Leaderboard
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <SectionHeading
          title="Already Contributed"
          info="Ranks one-time project purchases only. Standing monthly pledges are listed separately below."
        />
        {table}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <SectionHeading
          title="Ongoing Monthly Pledges"
          info="Active standing pledges are ongoing commitments and are not ranked with one-time project purchases."
        />
        {monthlyPledgers.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No active monthly pledges yet.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small" data-testid="monthly-pledge-list">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell align="right">Pledged</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {monthlyPledgers.map((row, i) => {
                  const isUser =
                    userAddress && row.owner.toLowerCase() === userAddress.toLowerCase()
                  return (
                    <TableRow
                      key={row.owner}
                      sx={isUser ? { bgcolor: 'action.selected' } : undefined}
                    >
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>
                        <Tooltip title={row.owner} placement="top">
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.85rem',
                              cursor: 'help',
                            }}
                          >
                            {truncateAddress(row.owner)}
                            {isUser && ' (you)'}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrencyAmount(
                          row.amount,
                          getConfiguredPaymentCurrency() ?? DEFAULT_PAYMENT_CURRENCY,
                        )}
                        /month
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
