import { useState } from 'react'
import { Alert, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { BeliefsAbi } from '@commonality/sdk/abis'
import { BeliefStates } from '@commonality/sdk/conceptspace'
import { cidToBytes32 } from '@commonality/sdk/utils'
import { getRuntimeConfigValue } from '../lib/runtimeConfig'
import { sendCallsPreferAtomic } from '../lib/causeRoster'
import { useWriteClients } from '../lib/useWriteClients'
import { WalletButton } from './WalletButton'

interface SelectedPlank {
  cid: string
  text: string
}

interface Props {
  planks: readonly SelectedPlank[]
  onSupported: () => void
}

export function SelectedPlankSupport({ planks, onSupported }: Props) {
  const { address, isConnected } = useAccount()
  const clients = useWriteClients(address)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string>()
  const [error, setError] = useState<string>()
  const beliefsAddress = getRuntimeConfigValue('VITE_BELIEFS_CONTRACT_ADDRESS') as `0x${string}` | undefined

  if (planks.length < 2) return null

  const support = async () => {
    if (!clients || !beliefsAddress) {
      setError(!beliefsAddress ? 'Beliefs contract is not configured' : 'Wallet is not ready yet')
      return
    }
    setBusy(true)
    setError(undefined)
    setResult(undefined)
    try {
      const sent = await sendCallsPreferAtomic(clients, planks.map((plank) => ({
        to: beliefsAddress,
        abi: BeliefsAbi,
        functionName: 'setBelief',
        args: [cidToBytes32(plank.cid), BeliefStates.BELIEVES],
      })))
      setResult(sent.batched
        ? `Supported ${planks.length} statements in one atomic wallet batch.`
        : `Supported ${planks.length} statements in ${sent.hashes.length} transactions.`)
      onSupported()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not support the selected statements')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }} data-testid="selected-plank-support">
      <Stack spacing={1.25}>
        <div>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Review selected statements</Typography>
          <Typography variant="body2" color="text.secondary">
            This supports only the statements below—not the organizer, narrative, cause roster, or unselected statements.
          </Typography>
        </div>
        {planks.map((plank) => (
          <div key={plank.cid}>
            <Typography
              component={RouterLink}
              to={`/statement/${plank.cid}`}
              variant="body2"
              sx={{
                display: 'block',
                color: 'text.primary',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {plank.text}
            </Typography>
          </div>
        ))}
        {error && <Alert severity="error">{error}</Alert>}
        {result && <Alert severity="success">{result}</Alert>}
        {!isConnected ? <WalletButton /> : (
          <Button variant="contained" disabled={busy} onClick={() => void support()} data-testid="support-selected-planks">
            {busy ? <CircularProgress size={18} /> : `Support ${planks.length} selected statements`}
          </Button>
        )}
      </Stack>
    </Paper>
  )
}
