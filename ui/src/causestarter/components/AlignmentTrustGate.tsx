import { useMemo, useState } from 'react'
import { Alert, Button, Stack, TextField, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { isAddress } from 'viem'
import { TrustRegistryAbi } from '@commonality/sdk/abis'
import { waitForIndexerToSyncToTxHash } from '@commonality/sdk/indexer-sync'
import { setTrust } from '@commonality/sdk/subjectiv'
import {
  getRuntimeConfigValue,
  HARDHAT_DEV_ACCOUNTS,
  isLocalDevHost,
  notifySubjectivTrustNetworkInvalidated,
  useMachinery,
  useWriteClients,
} from '@ui/shared'
import { useAccount } from 'wagmi'

function suggestedLocalTrustee(connected?: string): { address: `0x${string}`; label: string } | null {
  if (!isLocalDevHost() || !connected) return null
  const other = HARDHAT_DEV_ACCOUNTS.find(
    (account) => account.address.toLowerCase() !== connected.toLowerCase(),
  )
  return other ? { address: other.address, label: other.label } : null
}

/**
 * Explains why project lists stay hidden until this wallet names someone
 * whose project-alignment vouches it will accept (Subjectiv trust graph).
 */
export function AlignmentTrustGate({
  error,
}: {
  error?: string | null
}) {
  const machinery = useMachinery()
  const { address, isConnected } = useAccount()
  const writeClients = useWriteClients(address)
  const [trustee, setTrustee] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const localSuggestion = useMemo(() => suggestedLocalTrustee(address), [address])

  const registryAddress = getRuntimeConfigValue('VITE_TRUST_REGISTRY_CONTRACT_ADDRESS') as
    | `0x${string}`
    | undefined

  const publishTrust = async (target: string) => {
    setFormError(null)
    if (!registryAddress) {
      setFormError('Trust registry is not configured for this environment.')
      return
    }
    if (!writeClients) {
      setFormError('Connect a wallet first, then name someone you trust.')
      return
    }
    if (!isAddress(target)) {
      setFormError('Enter a valid wallet address.')
      return
    }
    if (target.toLowerCase() === address?.toLowerCase()) {
      setFormError('You cannot trust your own wallet.')
      return
    }

    setBusy(true)
    try {
      const txHash = await setTrust(
        writeClients,
        { address: registryAddress, abi: TrustRegistryAbi },
        target,
        100,
      )
      await waitForIndexerToSyncToTxHash(machinery, writeClients.publicClient, txHash)
      notifySubjectivTrustNetworkInvalidated()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not record trust')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Alert severity={error ? 'warning' : 'info'} sx={{ borderRadius: 2 }} data-testid="alignment-trust-gate">
      <Stack spacing={1.25}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {error
            ? 'Project lists are paused because your trust network could not be loaded'
            : 'No project-vouching network is available'}
        </Typography>
        {error && (
          <Typography variant="body2">{error}</Typography>
        )}
        <Typography variant="body2">
          CauseStarter normally supplies a starter network until you name someone
          yourself. It is unavailable in this environment. Supporter counts (who
          signed the statements) are shown without this step.
          Project lists are different: a project only appears after someone
          vouches that it advances a statement, and CauseStarter only counts vouches
          from wallets in <em>your</em> trust network. That is not an attestation
          of this cause — it is an on-chain trust score saying “I will believe
          this person when they vouch for a project.”
        </Typography>
        {!isConnected ? (
          <Typography variant="body2">Connect a wallet to name someone you trust.</Typography>
        ) : (
          <>
            {localSuggestion && (
              <Button
                size="small"
                variant="contained"
                disabled={busy}
                onClick={() => void publishTrust(localSuggestion.address)}
                data-testid="trust-local-suggestion"
                sx={{ alignSelf: 'flex-start' }}
              >
                {busy ? 'Recording trust…' : `Local test: trust ${localSuggestion.label}`}
              </Button>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                size="small"
                fullWidth
                label="Wallet to trust"
                placeholder="0x…"
                value={trustee}
                onChange={(event) => setTrustee(event.target.value)}
                disabled={busy}
              />
              <Button
                size="small"
                variant="outlined"
                disabled={busy}
                onClick={() => void publishTrust(trustee.trim())}
                sx={{ flexShrink: 0 }}
              >
                Trust this wallet
              </Button>
            </Stack>
            {formError && (
              <Typography variant="body2" color="error">{formError}</Typography>
            )}
          </>
        )}
        <Button
          component={RouterLink}
          to="/settings"
          size="small"
          sx={{ alignSelf: 'flex-start', px: 0 }}
        >
          Open trust settings
        </Button>
      </Stack>
    </Alert>
  )
}
