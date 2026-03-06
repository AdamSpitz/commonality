import { Paper, Typography, Stack, Box, TextField, Button, Alert } from '@mui/material'
import { formatEther } from 'viem'
import { useWalletClient, usePublicClient } from 'wagmi'
import type { Project, ProjectToken, TestClients, AssuranceContract } from '@commonality/sdk'
import { AssuranceContractAbi, buyProjectTokens } from '@commonality/sdk'
import { useState } from 'react'

interface BuyTokensSectionProps {
  project: Project
  tokens: ProjectToken[]
  address: string | undefined
  onProjectRefresh: () => void
}

export function BuyTokensSection({ project, tokens, address, onProjectRefresh }: BuyTokensSectionProps) {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [buying, setBuying] = useState(false)
  const [buyError, setBuyError] = useState<string | null>(null)
  const [buySuccess, setBuySuccess] = useState<string | null>(null)

  const handleQuantityChange = (tokenId: string, value: string) => {
    setQuantities(prev => ({ ...prev, [tokenId]: value }))
  }

  const handleBuy = async () => {
    if (!walletClient || !publicClient || !address) return

    const tokenIds: bigint[] = []
    const tokenCounts: bigint[] = []
    let totalCost = 0n

    for (const token of tokens) {
      const qty = parseInt(quantities[token.tokenId] || '0', 10)
      if (qty > 0) {
        tokenIds.push(BigInt(token.tokenId))
        tokenCounts.push(BigInt(qty))
        totalCost += BigInt(qty) * BigInt(token.price)
      }
    }

    if (tokenIds.length === 0) {
      setBuyError('Please enter a quantity for at least one token')
      return
    }

    try {
      setBuying(true)
      setBuyError(null)
      setBuySuccess(null)

      const assuranceContract: AssuranceContract = {
        address: project.id as `0x${string}`,
        abi: AssuranceContractAbi,
      }

      const clients: TestClients = {
        walletClient: walletClient as any,
        publicClient: publicClient as any,
        account: address as `0x${string}`,
      }

      await buyProjectTokens(clients, assuranceContract, {
        buyer: address as `0x${string}`,
        tokenAddress: project.erc1155Address as `0x${string}`,
        tokenIds,
        tokenCounts,
        totalCost,
      })

      setBuySuccess('Tokens purchased successfully!')
      setQuantities({})
      onProjectRefresh()
    } catch (err) {
      console.error('Error buying tokens:', err)
      setBuyError(err instanceof Error ? err.message : 'Failed to buy tokens')
    } finally {
      setBuying(false)
    }
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Buy Tokens
      </Typography>

      <Stack spacing={2}>
        {tokens.map((token) => (
          <Box key={token.tokenId} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body1" sx={{ minWidth: 120 }}>
              Token #{token.tokenId}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
              {formatEther(BigInt(token.price))} ETH each
            </Typography>
            <TextField
              type="number"
              size="small"
              label="Quantity"
              value={quantities[token.tokenId] || ''}
              onChange={(e) => handleQuantityChange(token.tokenId, e.target.value)}
              inputProps={{ min: 0 }}
              sx={{ width: 120 }}
            />
          </Box>
        ))}

        <Button
          variant="contained"
          onClick={handleBuy}
          disabled={buying}
          sx={{ alignSelf: 'flex-start' }}
        >
          {buying ? 'Buying...' : 'Buy'}
        </Button>

        {buyError && <Alert severity="error">{buyError}</Alert>}
        {buySuccess && <Alert severity="success">{buySuccess}</Alert>}
      </Stack>
    </Paper>
  )
}
