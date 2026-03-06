import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import { formatEther } from 'viem'
import type { Contribution, Refund } from '@commonality/sdk'
import { computeContributorStats } from '../utils'

interface LeaderboardProps {
  contributions: Contribution[]
  refunds: Refund[]
}

export function Leaderboard({ contributions, refunds }: LeaderboardProps) {
  const leaderboard = computeContributorStats(contributions, refunds)

  if (leaderboard.length === 0) return null

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
            {leaderboard.map((entry, i) => (
              <TableRow key={entry.address}>
                <TableCell>{i + 1}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                </TableCell>
                <TableCell align="right">{formatEther(entry.contributed)} ETH</TableCell>
                <TableCell align="right">{formatEther(entry.refunded)} ETH</TableCell>
                <TableCell align="right">{formatEther(entry.net)} ETH</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}
