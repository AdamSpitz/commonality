import { useEffect, useRef, useState } from 'react'
import { Alert, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { useAccount } from 'wagmi'
import { BeliefsAbi } from '@commonality/sdk/abis'
import {
  BeliefStates,
  believeStatement,
  clearOpinion,
  getUserBelief,
  type BeliefsContract,
} from '@commonality/sdk/conceptspace'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { useWriteClients } from '../lib/useWriteClients'
import { useMachinery } from '../lib/useMachinery'
import { getRuntimeConfigValue } from '../lib/runtimeConfig'
import { WalletButton } from './WalletButton'

interface SupportButtonProps {
  statementCid: IpfsCidV1
  /** Called after support is recorded or retracted (e.g. refresh supporter counts). */
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
  const machinery = useMachinery()
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [beliefState, setBeliefState] = useState<number | null>(null)
  const operationContext = `${address ?? ''}:${statementCid}`
  const operationContextRef = useRef(operationContext)

  const beliefsAddress = (
    getRuntimeConfigValue('VITE_BELIEFS_CONTRACT_ADDRESS')
    || import.meta.env.VITE_BELIEFS_CONTRACT_ADDRESS
  ) as `0x${string}` | undefined

  useEffect(() => {
    operationContextRef.current = operationContext
    // Drop status banners when the wallet or statement changes so a prior user's
    // "retracted" (or error) message never stacks with the next user's state.
    setSuccess(null)
    setError(null)
    setBusy(false)

    if (!isConnected || !address) {
      setBeliefState(null)
      setChecking(false)
      return
    }

    let cancelled = false
    setBeliefState(null)
    setChecking(true)
    void (async () => {
      try {
        const belief = await getUserBelief(machinery, address, statementCid)
        if (cancelled) return
        setBeliefState(belief?.beliefState ?? BeliefStates.NO_OPINION)
      } catch (err) {
        if (cancelled) return
        console.error('Failed to load belief state:', err)
        // Fall back to "not supporting" so the stand action remains available.
        setBeliefState(BeliefStates.NO_OPINION)
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [address, isConnected, machinery, operationContext, statementCid])

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

  const getBeliefsContract = (): BeliefsContract | null => {
    if (!beliefsAddress) return null
    return { address: beliefsAddress, abi: BeliefsAbi }
  }

  const handleSupport = async () => {
    const startedFor = operationContext
    const isCurrent = () => operationContextRef.current === startedFor
    setError(null)
    setSuccess(null)

    if (!writeClients) {
      setError('Wallet is not ready yet')
      return
    }
    const beliefsContract = getBeliefsContract()
    if (!beliefsContract) {
      setError('Beliefs contract is not configured')
      return
    }

    setBusy(true)
    try {
      const txHash = await believeStatement(writeClients, beliefsContract, statementCid)
      const receipt = await writeClients.publicClient.waitForTransactionReceipt({ hash: txHash })
      if (receipt.status !== 'success') throw new Error('Support transaction reverted')
      if (!isCurrent()) return
      setBeliefState(BeliefStates.BELIEVES)
      setSuccess(null)
      onSupported?.()
    } catch (err) {
      if (isCurrent()) {
        setError(err instanceof Error ? err.message : 'Failed to record support')
      }
    } finally {
      if (isCurrent()) setBusy(false)
    }
  }

  const handleRetract = async () => {
    const startedFor = operationContext
    const isCurrent = () => operationContextRef.current === startedFor
    setError(null)
    setSuccess(null)

    if (!writeClients) {
      setError('Wallet is not ready yet')
      return
    }
    const beliefsContract = getBeliefsContract()
    if (!beliefsContract) {
      setError('Beliefs contract is not configured')
      return
    }

    setBusy(true)
    try {
      const txHash = await clearOpinion(writeClients, beliefsContract, statementCid)
      const receipt = await writeClients.publicClient.waitForTransactionReceipt({ hash: txHash })
      if (receipt.status !== 'success') throw new Error('Retract transaction reverted')
      if (!isCurrent()) return
      setBeliefState(BeliefStates.NO_OPINION)
      setSuccess('You retracted your support for this cause.')
      onSupported?.()
    } catch (err) {
      if (isCurrent()) {
        setError(err instanceof Error ? err.message : 'Failed to retract support')
      }
    } finally {
      if (isCurrent()) setBusy(false)
    }
  }

  if (checking || beliefState === null) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 0.5 }}>
        <CircularProgress size={18} />
        <Typography variant="body2" color="text.secondary">
          Checking your support…
        </Typography>
      </Stack>
    )
  }

  const alreadySupports = beliefState === BeliefStates.BELIEVES

  return (
    <Stack spacing={1.5}>
      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ borderRadius: 2 }}>{success}</Alert>}

      {alreadySupports ? (
        <>
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            You&apos;ve declared your support for this cause.
          </Alert>
          <Button
            variant="outlined"
            color="inherit"
            size="large"
            fullWidth
            disabled={busy}
            onClick={() => void handleRetract()}
            startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
            sx={{ minHeight: 48, borderRadius: 999, fontWeight: 600, textTransform: 'none' }}
          >
            {busy ? 'Retracting…' : 'Retract your support for this cause'}
          </Button>
        </>
      ) : (
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
      )}
    </Stack>
  )
}
