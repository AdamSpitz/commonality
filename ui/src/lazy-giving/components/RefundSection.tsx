import { Paper, Typography, Stack, Button, Alert } from '@mui/material'
import type { Project, Contribution, Refund, AssuranceContract } from '@commonality/sdk'
import { AssuranceContractAbi, refundProjectTokens } from '@commonality/sdk'
import { useState } from 'react'
import { computeUserTokenBalance } from '../utils'
import { useWriteClients } from '../../shared'

interface RefundSectionProps {
  project: Project
  contributions: Contribution[]
  refunds: Refund[]
  address: string | undefined
  onRefresh: () => void
}

export function RefundSection({ project, contributions, refunds, address, onRefresh }: RefundSectionProps) {
  const writeClients = useWriteClients(address)

  const userRefundableTokens = computeUserTokenBalance(address, contributions, refunds)

  const [refunding, setRefunding] = useState(false)
  const [refundError, setRefundError] = useState<string | null>(null)
  const [refundSuccess, setRefundSuccess] = useState<string | null>(null)

  const handleRefund = async () => {
    if (!writeClients || !address || userRefundableTokens.length === 0) return

    try {
      setRefunding(true)
      setRefundError(null)
      setRefundSuccess(null)

      const assuranceContract: AssuranceContract = {
        address: project.id as `0x${string}`,
        abi: AssuranceContractAbi,
      }

      const clients = writeClients!

      await refundProjectTokens(clients, assuranceContract, {
        holder: address as `0x${string}`,
        tokenAddress: project.erc1155Address as `0x${string}`,
        tokenIds: userRefundableTokens.map(t => BigInt(t.tokenId)),
        tokenCounts: userRefundableTokens.map(t => t.count),
      })

      setRefundSuccess('Tokens refunded successfully!')
      onRefresh()
    } catch (err) {
      console.error('Error refunding tokens:', err)
      setRefundError(err instanceof Error ? err.message : 'Failed to refund tokens')
    } finally {
      setRefunding(false)
    }
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Refund Tokens
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        The funding deadline has passed and the threshold was not met. You can refund your tokens.
      </Typography>

      <Stack spacing={1} sx={{ mb: 2 }}>
        {userRefundableTokens.map(({ tokenId, count }) => (
          <Typography key={tokenId} variant="body1">
            Token #{tokenId}: {count.toString()} refundable
          </Typography>
        ))}
      </Stack>

      <Button
        variant="contained"
        color="warning"
        onClick={handleRefund}
        disabled={refunding}
        sx={{ alignSelf: 'flex-start' }}
      >
        {refunding ? 'Refunding...' : 'Refund All'}
      </Button>

      {refundError && <Alert severity="error" sx={{ mt: 2 }}>{refundError}</Alert>}
      {refundSuccess && <Alert severity="success" sx={{ mt: 2 }}>{refundSuccess}</Alert>}
    </Paper>
  )
}
