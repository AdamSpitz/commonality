import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Tooltip,
} from '@mui/material'
import { formatEther } from 'viem'
import type { Contribution, Refund } from '@commonality/sdk'
import { computeContributorStats } from '../utils'

function truncateAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

/** Renders an address chain as "Alice → Bob → Charlie" with tooltips showing full addresses */
function ChainDisplay({ chain }: { chain: string[] }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
      {chain.map((addr, i) => (
        <Box key={addr} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {i > 0 && <Typography variant="caption" color="text.secondary">→</Typography>}
          <Tooltip title={addr} placement="top">
            <Typography
              variant="caption"
              sx={{ fontFamily: 'monospace', cursor: 'help', textDecoration: 'underline dotted' }}
            >
              {truncateAddr(addr)}
            </Typography>
          </Tooltip>
        </Box>
      ))}
    </Box>
  )
}

interface LeaderboardProps {
  contributions: Contribution[]
  refunds: Refund[]
  /** Map from transaction hash to sorted delegation chain (root → leaf addresses) */
  contributionChains?: Record<string, string[]>
}

export function Leaderboard({ contributions, refunds, contributionChains }: LeaderboardProps) {
  const leaderboard = computeContributorStats(contributions, refunds)

  if (leaderboard.length === 0) return null

  // Build per-address map of unique delegation chains from their contributions
  const addressChains: Record<string, string[][]> = {}
  if (contributionChains && Object.keys(contributionChains).length > 0) {
    for (const c of contributions) {
      const chain = contributionChains[c.transactionHash]
      if (!chain) continue
      const addr = c.participant.toLowerCase()
      if (!addressChains[addr]) addressChains[addr] = []
      // Deduplicate chains by their string representation
      const chainKey = chain.join(',')
      if (!addressChains[addr].some(existing => existing.join(',') === chainKey)) {
        addressChains[addr].push(chain)
      }
    }
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Contributor Leaderboard
      </Typography>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Address</TableCell>
              <TableCell align="right">Contributed</TableCell>
              <TableCell align="right">Refunded</TableCell>
              <TableCell align="right">Net</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leaderboard.map((entry, i) => {
              const chains = addressChains[entry.address]
              return (
                <TableRow key={entry.address}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {truncateAddr(entry.address)}
                    </Typography>
                    {chains && chains.length > 0 && (
                      <Box sx={{ mt: 0.5 }}>
                        {chains.map((chain, ci) => (
                          <Box key={ci} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                              via:
                            </Typography>
                            <ChainDisplay chain={chain} />
                          </Box>
                        ))}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell align="right">{formatEther(entry.contributed)} ETH</TableCell>
                  <TableCell align="right">{formatEther(entry.refunded)} ETH</TableCell>
                  <TableCell align="right">{formatEther(entry.net)} ETH</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}
