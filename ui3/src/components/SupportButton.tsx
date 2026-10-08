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
import { NeedLogin, useCanSignChain } from './NeedLogin'

export type SupportAction = 'support' | 'retract'

export interface SupportSettledInfo {
  action: SupportAction
  indexed: boolean
}

interface SupportButtonProps {
  statementCid: IpfsCidV1
  onSupported?: (info: SupportSettledInfo) => void
  /** Issue #116: supporters support the stated goal (or a belief). */
  subject?: 'goal' | 'belief' | 'statement'
  label?: string
}

const INDEXER_POLL_DELAYS_MS = [50, 100, 200, 400, 800, 1200] as const

const INDEXER_OFFLINE_MESSAGE =
  'Support status unavailable (indexer offline). You can still support; counts may lag until the indexer is back.'

function isIndexerStatusError(message: string): boolean {
  return /Failed to fetch events|500|502|503|504|indexer|ECONNRESET|network|Failed to fetch/i.test(message)
}

/** Never surface raw event-cache HTTP errors in the Support UI. */
function humanizeSupportError(message: string): { text: string; severity: 'error' | 'warning' } {
  if (isIndexerStatusError(message)) {
    return { text: INDEXER_OFFLINE_MESSAGE, severity: 'warning' }
  }
  return { text: message, severity: 'error' }
}

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
      // transient
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
  subject = 'goal',
  label,
}: SupportButtonProps) {
  const { address, isConnected } = useAccount()
  const canSign = useCanSignChain()
  const writeClients = useWriteClients(address)
  const machinery = useMachinery()
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorSeverity, setErrorSeverity] = useState<'error' | 'warning'>('error')
  const [success, setSuccess] = useState<string | null>(null)
  const [beliefState, setBeliefState] = useState<number | null>(null)
  const operationContext = `${(address ?? '').toLowerCase()}:${statementCid}`
  const operationContextRef = useRef(operationContext)
  const loadedContextRef = useRef<string>('')

  const actionLabel = label
    ?? (subject === 'belief' ? 'Stand with this belief' : `Support this ${subject}`)

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
      setError(null)
      return
    }
    if (!beliefsAddress) return

    const isSoftRevalidate = loadedContextRef.current === operationContext
    if (!isSoftRevalidate) {
      setBeliefState(null)
      setChecking(true)
    }
    // Clear prior status errors so HMR/stale "Failed to fetch events: 500" never sticks.
    setError(null)
    setErrorSeverity('error')
    setSuccess(null)

    let cancelled = false
    void (async () => {
      try {
        const belief = await getUserBelief(machinery, address, statementCid)
        if (cancelled || operationContextRef.current !== operationContext) return
        setBeliefState(belief?.beliefState ?? BeliefStates.NO_OPINION)
        loadedContextRef.current = operationContext
      } catch (err) {
        if (cancelled) return
        // Indexer/event-cache may be down; still allow support txs against the chain.
        // Treat as no known support so the primary action stays available.
        setBeliefState((prev) => (prev === null ? BeliefStates.NO_OPINION : prev))
        loadedContextRef.current = operationContext
        const msg = err instanceof Error ? err.message : 'Could not load support status'
        const friendly = humanizeSupportError(msg)
        // Soft revalidate: keep prior beliefState, only surface indexer issues as warning.
        setErrorSeverity(friendly.severity)
        setError(friendly.text)
      } finally {
        // Always clear checking so the button never stays stuck disabled.
        if (!cancelled) setChecking(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [address, beliefsAddress, isConnected, machinery, operationContext, statementCid])

  const isSupporting = beliefState === BeliefStates.BELIEVES

  const run = async (action: SupportAction) => {
    if (!writeClients || !beliefsAddress) {
      setError('Connect a wallet and ensure contracts are configured.')
      return
    }
    setBusy(true)
    setError(null)
    setErrorSeverity('error')
    setSuccess(null)
    const beliefs: BeliefsContract = { address: beliefsAddress, abi: BeliefsAbi }
    try {
      if (action === 'support') {
        await believeStatement(writeClients, beliefs, statementCid)
        setBeliefState(BeliefStates.BELIEVES)
        setSuccess(`You support this ${subject}.`)
        const indexed = address
          ? await waitForIndexedBelief(
            machinery,
            address,
            statementCid,
            BeliefStates.BELIEVES,
            () => operationContextRef.current === operationContext,
          )
          : false
        onSupported?.({ action, indexed })
      } else {
        await clearOpinion(writeClients, beliefs, statementCid)
        setBeliefState(BeliefStates.NO_OPINION)
        setSuccess('Support retracted.')
        const indexed = address
          ? await waitForIndexedBelief(
            machinery,
            address,
            statementCid,
            BeliefStates.NO_OPINION,
            () => operationContextRef.current === operationContext,
          )
          : false
        onSupported?.({ action, indexed })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction failed'
      const friendly = humanizeSupportError(msg)
      // Chain/tx errors stay red; indexer noise becomes a warning.
      setErrorSeverity(friendly.severity === 'warning' ? 'warning' : 'error')
      setError(friendly.severity === 'warning' ? friendly.text : msg)
    } finally {
      setBusy(false)
    }
  }

  if (!canSign) {
    return <NeedLogin action={`support this ${subject}`} needWallet />
  }

  // Belt-and-suspenders: rewrite any stuck raw event-cache error from HMR/stale state.
  const shownError = error ? humanizeSupportError(error) : null

  return (
    <Stack spacing={1}>
      {checking && beliefState === null && (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Typography variant="caption" color="text.secondary">Checking…</Typography>
        </Stack>
      )}
      <Button
        variant={isSupporting ? 'outlined' : 'contained'}
        color={isSupporting ? 'inherit' : 'primary'}
        disabled={busy || (checking && beliefState === null) || !isConnected}
        onClick={() => void run(isSupporting ? 'retract' : 'support')}
        sx={{ minHeight: 44, borderRadius: 999, textTransform: 'none', fontWeight: 700 }}
        data-testid="support-button"
      >
        {busy ? 'Working…' : isSupporting ? 'Retract support' : actionLabel}
      </Button>
      {shownError && (
        <Alert severity={shownError.severity === 'warning' ? 'warning' : errorSeverity}>
          {shownError.text}
        </Alert>
      )}
      {success && <Alert severity="success">{success}</Alert>}
    </Stack>
  )
}
