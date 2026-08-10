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
import type { SDKMachinery } from '@commonality/sdk/machinery'
import { useWriteClients } from '../lib/useWriteClients'
import { useMachinery } from '../lib/useMachinery'
import { getRuntimeConfigValue } from '../lib/runtimeConfig'
import { WalletButton } from './WalletButton'

export type SupportAction = 'support' | 'retract'

export interface SupportSettledInfo {
  action: SupportAction
  /** True when the event cache has observed the new belief state. */
  indexed: boolean
}

interface SupportButtonProps {
  statementCid: IpfsCidV1
  /**
   * Called after support is recorded or retracted.
   * Prefer waiting until `indexed` is true before trusting a supporter-count refresh.
   */
  onSupported?: (info: SupportSettledInfo) => void
  label?: string
}

const INDEXER_POLL_DELAYS_MS = [50, 100, 200, 400, 800, 1200] as const

async function waitForIndexedBelief(
  machinery: SDKMachinery,
  userAddress: string,
  statementCid: IpfsCidV1,
  expectedState: number,
  isCurrent: () => boolean,
): Promise<boolean> {
  for (let attempt = 0; attempt <= INDEXER_POLL_DELAYS_MS.length; attempt++) {
    if (!isCurrent()) return false
    try {
      const belief = await getUserBelief(machinery, userAddress, statementCid)
      if ((belief?.beliefState ?? BeliefStates.NO_OPINION) === expectedState) {
        return true
      }
    } catch {
      // Keep polling — transient cache misses are expected right after a tx.
    }
    if (attempt >= INDEXER_POLL_DELAYS_MS.length) break
    const delay = INDEXER_POLL_DELAYS_MS[attempt]!
    await new Promise((resolve) => setTimeout(resolve, delay))
  }
  return false
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
  // Normalize address so checksum/case flips do not look like a wallet switch.
  const operationContext = `${(address ?? '').toLowerCase()}:${statementCid}`
  const operationContextRef = useRef(operationContext)
  // Last wallet+statement we fully loaded. Soft revalidations keep the current
  // status UI so the declared/retracted alert does not unmount and collapse layout.
  const loadedContextRef = useRef<string>('')

  const beliefsAddress = (
    getRuntimeConfigValue('VITE_BELIEFS_CONTRACT_ADDRESS')
    || import.meta.env.VITE_BELIEFS_CONTRACT_ADDRESS
  ) as `0x${string}` | undefined

  useEffect(() => {
    operationContextRef.current = operationContext

    if (!isConnected || !address) {
      loadedContextRef.current = ''
      setBeliefState(null)
      setChecking(false)
      setSuccess(null)
      setError(null)
      setBusy(false)
      return
    }

    // Already showing a status for this wallet+statement. Do not re-fetch on
    // parent re-renders (chip updates): that used to flash "Checking…" and could
    // briefly overwrite a just-recorded support with a lagging indexer read.
    if (loadedContextRef.current === operationContext) {
      return
    }

    setSuccess(null)
    setError(null)
    setBusy(false)
    setBeliefState(null)
    setChecking(true)

    let cancelled = false
    void (async () => {
      try {
        const belief = await getUserBelief(machinery, address, statementCid)
        if (cancelled || operationContextRef.current !== operationContext) return
        setBeliefState(belief?.beliefState ?? BeliefStates.NO_OPINION)
        loadedContextRef.current = operationContext
      } catch (err) {
        if (cancelled || operationContextRef.current !== operationContext) return
        console.error('Failed to load belief state:', err)
        // Fall back to "not supporting" so the stand action remains available.
        setBeliefState(BeliefStates.NO_OPINION)
        loadedContextRef.current = operationContext
      } finally {
        if (!cancelled && operationContextRef.current === operationContext) {
          setChecking(false)
        }
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
    // Keep any prior status alert visible until the tx lands (avoids a blank gap
    // while Recording…), then swap to the declared state in one update.

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
      // Update the button immediately; counts wait for the event cache below.
      setBeliefState(BeliefStates.BELIEVES)
      setSuccess(null)
      loadedContextRef.current = operationContext
      // Notify parent right away so the chip can optimistically tick up.
      onSupported?.({ action: 'support', indexed: false })
      const indexed = address
        ? await waitForIndexedBelief(
          machinery,
          address,
          statementCid,
          BeliefStates.BELIEVES,
          isCurrent,
        )
        : false
      if (!isCurrent()) return
      onSupported?.({ action: 'support', indexed })
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
      // Swap declared → retracted in one commit so the status band never empties.
      setBeliefState(BeliefStates.NO_OPINION)
      setSuccess('You retracted your support for this cause.')
      loadedContextRef.current = operationContext
      onSupported?.({ action: 'retract', indexed: false })
      const indexed = address
        ? await waitForIndexedBelief(
          machinery,
          address,
          statementCid,
          BeliefStates.NO_OPINION,
          isCurrent,
        )
        : false
      if (!isCurrent()) return
      onSupported?.({ action: 'retract', indexed })
    } catch (err) {
      if (isCurrent()) {
        setError(err instanceof Error ? err.message : 'Failed to retract support')
      }
    } finally {
      if (isCurrent()) setBusy(false)
    }
  }

  // Initial load only — never replace a known status UI with the compact spinner.
  if ((checking && beliefState === null) || beliefState === null) {
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

      {/*
        Single status band: either "declared" or the retract success message.
        Avoid stacking both, and avoid a frame with neither during transitions.
      */}
      {alreadySupports ? (
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          You&apos;ve declared your support for this cause.
        </Alert>
      ) : success ? (
        <Alert severity="success" sx={{ borderRadius: 2 }}>{success}</Alert>
      ) : null}

      {alreadySupports ? (
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

