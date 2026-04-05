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
import { formatEther } from 'viem'
import { useAccount } from 'wagmi'
import {
  getTopContributorsForCause,
  getUserContributionRankForCause,
  type ContributorStats,
  type IpfsCidV1,
} from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { useTrustedSet } from '../../shared/hooks/useTrustedSet'

function truncateAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function CauseLeaderboardPage() {
  const { statementCid } = useParams<{ statementCid: string }>()
  const machinery = useMachinery()
  const { address: userAddress } = useAccount()
  const { trustedSet, isLoading: trustedSetLoading } = useTrustedSet(userAddress)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contributors, setContributors] = useState<ContributorStats[]>([])
  const [userRank, setUserRank] = useState<{
    rank: number
    stats: ContributorStats | null
    totalContributors: number
  } | null>(null)

  useEffect(() => {
    if (!statementCid) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const topContributors = await getTopContributorsForCause(
          machinery,
          statementCid as IpfsCidV1,
          50,
          undefined,
          trustedSet,
        )
        if (cancelled) return
        setContributors(topContributors)

        if (userAddress) {
          const rankResult = await getUserContributionRankForCause(
            machinery,
            statementCid as IpfsCidV1,
            userAddress,
            undefined,
            trustedSet,
          )
          if (cancelled) return
          setUserRank(rankResult)
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
          ← Back to Funding Portal
        </Button>
      </Box>

      {/* My Rank summary card */}
      {userRank && userRank.stats && userRank.rank > 0 && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'action.hover' }}>
          <Typography variant="h6" gutterBottom>
            Your Rank
          </Typography>
          <Typography variant="body1">
            You are <strong>#{userRank.rank}</strong> contributor to this cause
            {' — '}
            {formatEther(userRank.stats.netContribution)} ETH across{' '}
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

        {contributors.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No contributions yet.
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
                            {truncateAddr(entry.participant)}
                            {isUser && ' (you)'}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        {formatEther(entry.totalContributed)} ETH
                      </TableCell>
                      <TableCell align="right">
                        {entry.projectsContributedTo}
                      </TableCell>
                      <TableCell align="right">
                        {formatEther(entry.netContribution)} ETH
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
