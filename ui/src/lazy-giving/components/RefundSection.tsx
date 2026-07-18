import { Paper, Typography, Stack, Button, Alert, Link } from '@mui/material'
import type { Project, Contribution, Refund, AssuranceContract } from '@commonality/sdk/lazy-giving'
import { AssuranceContractAbi } from '@commonality/sdk/abis'
import { approveERC1155ForOperator, refundProjectTokens } from '@commonality/sdk/lazy-giving'
import { useState } from 'react'
import { computeUserTokenBalance } from '../utils'
import { useWriteClients } from '../../shared'
import { ContributionNotificationEmail } from './ContributionNotificationEmail'

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
  const [refundTxUrl, setRefundTxUrl] = useState<string | null>(null)

  const handleRefund = async () => {
    if (!writeClients || !address || userRefundableTokens.length === 0) return

    try {
      setRefunding(true)
      setRefundError(null)
      setRefundSuccess(null)
      setRefundTxUrl(null)

      const assuranceContract: AssuranceContract = {
        address: project.id as `0x${string}`,
        abi: AssuranceContractAbi,
      }

      const clients = writeClients!

      await approveERC1155ForOperator(
        clients,
        project.erc1155Address as `0x${string}`,
        project.id as `0x${string}`,
      )

      const txHash = await refundProjectTokens(clients, assuranceContract, {
        holder: address as `0x${string}`,
        tokenAddress: project.erc1155Address as `0x${string}`,
        tokenIds: userRefundableTokens.map(t => BigInt(t.tokenId)),
        tokenCounts: userRefundableTokens.map(t => t.count),
      })

      const explorerUrl = clients.walletClient.chain?.blockExplorers?.default?.url
      setRefundTxUrl(explorerUrl ? `${explorerUrl}/tx/${txHash}` : null)
      setRefundSuccess('Refund sent. The returned USDC is in your wallet once the transaction confirms. If you use Commonality with an embedded wallet, the approval and refund can be gas-sponsored so you do not need ETH just to recover funds.')
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
        The funding deadline has passed and the threshold was not met. You can return these receipt tokens
        onchain and receive the project USDC back in this wallet. Commonality never custodies those funds.
        Embedded-wallet refunds first approve this project to reclaim the receipts, then submit the refund;
        both calls are eligible for sponsored gas when the project's gas tank is funded.
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        After the refund, you can keep the USDC in your wallet, use it for another contribution, or move it out
        through a licensed off-ramp/KYC flow supported by your wallet or on-ramp provider.
      </Alert>

      <ContributionNotificationEmail kind="refund-available" project={project} />

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
      {refundSuccess && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {refundSuccess}
          {refundTxUrl && (
            <>
              {' '}
              <Link href={refundTxUrl} target="_blank" rel="noreferrer">
                View transaction.
              </Link>
            </>
          )}
        </Alert>
      )}
    </Paper>
  )
}
