import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import type { Trade } from '@commonality/sdk'
import { formatCurrencyAmount } from '../../shared/currency'

interface TradeHistoryProps {
  trades: Trade[]
}

export function TradeHistory({ trades }: TradeHistoryProps) {
  if (trades.length === 0) return null

  return (
    <Accordion sx={{ mb: 3 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h5" component="h2">
          Trade History ({trades.length})
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Buyer</TableCell>
                <TableCell>Seller</TableCell>
                <TableCell>Token ID</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Price</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {trades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell>
                    {new Date(Number(trade.createdAt) * 1000).toLocaleDateString()}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {trade.buyer.slice(0, 6)}...{trade.buyer.slice(-4)}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {trade.seller.slice(0, 6)}...{trade.seller.slice(-4)}
                  </TableCell>
                  <TableCell>{trade.tokenId}</TableCell>
                  <TableCell align="right">{trade.count}</TableCell>
                  <TableCell align="right">{formatCurrencyAmount(trade.totalPrice, trade.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </AccordionDetails>
    </Accordion>
  )
}
