import { Paper, Typography, Stack, Box, TextField, Button, Alert } from '@mui/material'
import type { Project, Contribution, Refund, TokenBurn } from '@commonality/sdk/lazy-giving'
import { burnTokens } from '@commonality/sdk/lazy-giving'
import { useState } from 'react'
import { computeUserTokenBalance } from '../utils'
import { useWriteClients } from '../../shared'

interface BurnTokensSectionProps {
  project: Project
  contributions: Contribution[]
  refunds: Refund[]
  userBurns: TokenBurn[]
  address: string | undefined
  onRefresh: () => void
  tokenImages?: Record<string, string>
}

export function BurnTokensSection({ project, contributions, refunds, userBurns, address, onRefresh, tokenImages = {} }: BurnTokensSectionProps) {
  const writeClients = useWriteClients(address)

  const userBurnableTokens = computeUserTokenBalance(address, contributions, refunds, userBurns)

  const [burnQuantities, setBurnQuantities] = useState<Record<string, string>>({})
  const [burning, setBurning] = useState(false)
  const [burnError, setBurnError] = useState<string | null>(null)
  const [burnSuccess, setBurnSuccess] = useState<string | null>(null)

  const handleBurn = async () => {
    if (!writeClients || !address || userBurnableTokens.length === 0) return

    const tokenIds: bigint[] = []
    const tokenCounts: bigint[] = []

    for (const token of userBurnableTokens) {
      const qty = parseInt(burnQuantities[token.tokenId] || '0', 10)
      if (qty > 0) {
        tokenIds.push(BigInt(token.tokenId))
        tokenCounts.push(BigInt(qty))
      }
    }

    if (tokenIds.length === 0) {
      setBurnError('Please enter a quantity for at least one token')
      return
    }

    try {
      setBurning(true)
      setBurnError(null)
      setBurnSuccess(null)

      const clients = writeClients!

      await burnTokens(clients, project.erc1155Address as `0x${string}`, {
        tokenIds,
        tokenCounts,
      })

      setBurnSuccess('Tokens burned successfully!')
      setBurnQuantities({})
      onRefresh()
    } catch (err) {
      console.error('Error burning tokens:', err)
      setBurnError(err instanceof Error ? err.message : 'Failed to burn tokens')
    } finally {
      setBurning(false)
    }
  }

  return (
    <Paper id="burn-receipts" sx={{ p: 3, mb: 3, scrollMarginTop: 24 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Burn Tokens
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Burn your tokens to convert from investor to donor. This action is irreversible.
      </Typography>

      <Stack spacing={2}>
        {userBurnableTokens.map(({ tokenId, count }) => (
          <Box key={tokenId} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {tokenImages[tokenId] && (
              <Box
                component="img"
                src={tokenImages[tokenId]}
                alt={`Token #${tokenId}`}
                sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1 }}
              />
            )}
            <Typography variant="body1" sx={{ minWidth: 120 }}>
              Token #{tokenId}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
              {count.toString()} available
            </Typography>
            <TextField
              type="number"
              size="small"
              label="Quantity"
              value={burnQuantities[tokenId] || ''}
              onChange={(e) => setBurnQuantities(prev => ({ ...prev, [tokenId]: e.target.value }))}
              inputProps={{ min: 1, max: Number(count) }}
              sx={{ width: 120 }}
            />
          </Box>
        ))}

        <Button
          variant="contained"
          color="error"
          onClick={handleBurn}
          disabled={burning}
          sx={{ alignSelf: 'flex-start' }}
        >
          {burning ? 'Burning...' : 'Burn Tokens'}
        </Button>

        {burnError && <Alert severity="error">{burnError}</Alert>}
        {burnSuccess && <Alert severity="success">{burnSuccess}</Alert>}
      </Stack>
    </Paper>
  )
}
