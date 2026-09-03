import { Link as RouterLink } from 'react-router-dom'
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
  Button,
  IconButton,
  Stack,
  Tooltip,
} from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import type { Contribution, Refund } from '@commonality/sdk/lazy-giving'
import { computeContributorStats } from '../utils'
import { formatCurrencyAmount } from '../../shared'
import { truncateAddress } from '../../shared'

function SectionHeading({ title, info }: { title: string; info: string }) {
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
              {truncateAddress(addr)}
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
  /** Cap the ranked table. Full page shows everyone; preview typically uses 3. */
  limit?: number
  /**
   * Compact section for embedding on a project page: heading + optional
   * “Show more” link to the full leaderboard.
   */
  embedded?: boolean
  /** In-app path for the “Show more” control when {@link embedded}. */
  fullPageTo?: string
}

export function Leaderboard({
  contributions,
  refunds,
  contributionChains,
  limit,
  embedded = false,
  fullPageTo,
}: LeaderboardProps) {
  const leaderboard = computeContributorStats(contributions, refunds)
  const visible = limit != null ? leaderboard.slice(0, limit) : leaderboard

  // Build per-address map of unique delegation chains from their contributions
  const addressChains: Record<string, string[][]> = {}
  if (contributionChains && Object.keys(contributionChains).length > 0) {
    for (const c of contributions) {
      const chain = contributionChains[c.transactionHash]
      if (!chain) continue
      const addr = c.contributor.toLowerCase()
      if (!addressChains[addr]) addressChains[addr] = []
      // Deduplicate chains by their string representation
      const chainKey = chain.join(',')
      if (!addressChains[addr].some(existing => existing.join(',') === chainKey)) {
        addressChains[addr].push(chain)
      }
    }
  }

  const table = visible.length === 0 ? (
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
            <TableCell align="right">Refunded</TableCell>
            <TableCell align="right">Net</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {visible.map((entry, i) => {
              const chains = addressChains[entry.address]
              return (
                <TableRow key={entry.address}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {truncateAddress(entry.address)}
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
                  <TableCell align="right">{formatCurrencyAmount(entry.contributed, entry.currency)}</TableCell>
                  <TableCell align="right">{formatCurrencyAmount(entry.refunded, entry.currency)}</TableCell>
                  <TableCell align="right">{formatCurrencyAmount(entry.net, entry.currency)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
  )

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, mb: 3 }}
      data-testid={embedded ? 'project-leaderboard-preview' : 'project-leaderboard'}
    >
      <SectionHeading
        title="Already Contributed"
        info={
          embedded
            ? `Top ${limit ?? 3} by net contribution to this project.`
            : 'Ranks purchases of this project. Refunds reduce net contribution.'
        }
      />
      {table}
      {embedded && fullPageTo && (
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
