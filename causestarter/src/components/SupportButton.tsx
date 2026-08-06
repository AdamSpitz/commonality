import { useState } from 'react'
import { Alert, Button, CircularProgress, Stack } from '@mui/material'
import { useAccount } from 'wagmi'
import { BeliefsAbi } from '@commonality/sdk/abis'
import { believeStatement, type BeliefsContract } from '@commonality/sdk/conceptspace'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { useWriteClients } from '../lib/useWriteClients'
import { getRuntimeConfigValue } from '../lib/runtimeConfig'
import { WalletButton } from './WalletButton'

interface SupportButtonProps {
  statementCid: IpfsCidV1
  onSupported?: () => void
  label?: string
}

export function SupportButton({
  statementCid,
  onSupported,
  label = 'Stand with this cause',
}: SupportButtonProps) {
  const { address, isConnected } = useAccount()
  const writeClients = useWriteClients(address)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const beliefsAddress = (
    getRuntimeConfigValue('VITE_BELIEFS_CONTRACT_ADDRESS')
    || import.meta.env.VITE_BELIEFS_CONTRACT_ADDRESS
  ) as `0x${string}` | undefined

  if (!isConnected) {
    return (
      <Stack spacing={1.5}>
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Connect a wallet to publicly stand with this cause.
        </Alert>
        <WalletButton />
      </Stack>
    )
  }

  const handleSupport = async () => {
    setError(null)
    setSuccess(null)

    if (!writeClients) {
      setError('Wallet is not ready yet')
      return
    }
    if (!beliefsAddress) {
      setError('Beliefs contract is not configured')
      return
    }

    setBusy(true)
    try {
      const beliefsContract: BeliefsContract = {
        address: beliefsAddress,
        abi: BeliefsAbi,
      }
      const txHash = await believeStatement(writeClients, beliefsContract, statementCid)
      await writeClients.publicClient.waitForTransactionReceipt({ hash: txHash })
      setSuccess('You are standing with this cause.')
      onSupported?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record support')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack spacing={1.5}>
      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ borderRadius: 2 }}>{success}</Alert>}
      <Button
        variant="contained"
        size="large"
        fullWidth
        disabled={busy}
        onClick={() => void handleSupport()}
        startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
        sx={{ minHeight: 48, borderRadius: 999, fontWeight: 700, textTransform: 'none' }}
      >
        {busy ? 'Recording…' : label}
      </Button>
    </Stack>
  )
}
