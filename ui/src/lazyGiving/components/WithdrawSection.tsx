import { Paper, Typography, Button, Alert } from '@mui/material'
import type { Project, AssuranceContract } from '@commonality/sdk'
import { AssuranceContractAbi, withdrawProjectFunds } from '@commonality/sdk'
import { useState } from 'react'
import { useWriteClients } from '../../shared/hooks/useWriteClients'

interface WithdrawSectionProps {
  project: Project
  address: string | undefined
  onRefresh: () => void
}

export function WithdrawSection({ project, address, onRefresh }: WithdrawSectionProps) {
  const writeClients = useWriteClients(address)

  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null)

  const handleWithdraw = async () => {
    if (!writeClients || !address) return

    try {
      setWithdrawing(true)
      setWithdrawError(null)
      setWithdrawSuccess(null)

      const assuranceContract: AssuranceContract = {
        address: project.id as `0x${string}`,
        abi: AssuranceContractAbi,
      }

      const clients = writeClients!

      await withdrawProjectFunds(clients, assuranceContract)

      setWithdrawSuccess('Funds withdrawn successfully!')
      onRefresh()
    } catch (err) {
      console.error('Error withdrawing funds:', err)
      setWithdrawError(err instanceof Error ? err.message : 'Failed to withdraw funds')
    } finally {
      setWithdrawing(false)
    }
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Withdraw Funds
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        The funding threshold has been met. You can withdraw the raised funds.
      </Typography>

      <Button
        variant="contained"
        color="success"
        onClick={handleWithdraw}
        disabled={withdrawing}
      >
        {withdrawing ? 'Withdrawing...' : 'Withdraw Funds'}
      </Button>

      {withdrawError && <Alert severity="error" sx={{ mt: 2 }}>{withdrawError}</Alert>}
      {withdrawSuccess && <Alert severity="success" sx={{ mt: 2 }}>{withdrawSuccess}</Alert>}
    </Paper>
  )
}
