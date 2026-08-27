import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, CircularProgress, Stack } from '@mui/material'
import { useAccount } from 'wagmi'
import { BeliefsAbi } from '@commonality/sdk/abis'
import { BeliefStates, getUserBelief } from '@commonality/sdk/conceptspace'
import { cidToBytes32, type IpfsCidV1 } from '@commonality/sdk/utils'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import { mapWithConcurrency, PLANK_QUERY_CONCURRENCY } from '../lib/concurrency'
import { getRuntimeConfigValue } from '../../shared'
import { sendCallsPreferAtomic } from '../lib/causeRoster'
import { useWriteClients } from '../../shared'
import { ConnectWalletHint } from './ConnectWalletHint'

interface SelectedPlank {
  cid: IpfsCidV1
  text: string
}

interface Props {
  planks: readonly SelectedPlank[]
  machinery: SDKMachinery
  onSupported: () => void
}

export function SelectedPlankSupport({ planks, machinery, onSupported }: Props) {
  const { address, isConnected } = useAccount()
  const clients = useWriteClients(address)
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const [signedCids, setSignedCids] = useState<Set<string>>(new Set())
  const [result, setResult] = useState<string>()
  const [error, setError] = useState<string>()
  const beliefsAddress = getRuntimeConfigValue('VITE_BELIEFS_CONTRACT_ADDRESS') as `0x${string}` | undefined

  const plankKey = planks.map((plank) => plank.cid).join('\0')

  useEffect(() => {
    let cancelled = false
    if (!isConnected || !address || planks.length === 0) {
      setSignedCids(new Set())
      setChecking(false)
      return
    }
    setChecking(true)
    void mapWithConcurrency(planks, PLANK_QUERY_CONCURRENCY, async (plank) => {
      const belief = await getUserBelief(machinery, address, plank.cid)
      return { cid: plank.cid, state: belief?.beliefState ?? BeliefStates.NO_OPINION }
    }).then((rows) => {
      if (cancelled) return
      setSignedCids(new Set(
        rows.filter((row) => row.state === BeliefStates.BELIEVES).map((row) => row.cid),
      ))
      setChecking(false)
    }).catch((cause) => {
      if (cancelled) return
      setError(cause instanceof Error ? cause.message : 'Could not check which statements you have signed')
      setChecking(false)
    })
    return () => {
      cancelled = true
    }
  }, [address, isConnected, machinery, plankKey, planks])

  const unsigned = useMemo(
    () => planks.filter((plank) => !signedCids.has(plank.cid)),
    [planks, signedCids],
  )
  const canSign = isConnected && !busy && !checking && unsigned.length > 0

  const support = async () => {
    if (!clients || !beliefsAddress) {
      setError(!beliefsAddress ? 'Beliefs contract is not configured' : 'Wallet is not ready yet')
      return
    }
    if (unsigned.length === 0) return
    setBusy(true)
    setError(undefined)
    setResult(undefined)
    try {
      const sent = await sendCallsPreferAtomic(clients, unsigned.map((plank) => ({
        to: beliefsAddress,
        abi: BeliefsAbi,
        functionName: 'setBelief',
        args: [cidToBytes32(plank.cid), BeliefStates.BELIEVES],
      })))
      const countLabel = unsigned.length === 1 ? '1 statement' : `${unsigned.length} statements`
      setResult(sent.batched
        ? `Signed ${countLabel} in one atomic wallet batch.`
        : `Signed ${countLabel} in ${sent.hashes.length} transactions.`)
      setSignedCids((current) => {
        const next = new Set(current)
        for (const plank of unsigned) next.add(plank.cid)
        return next
      })
      onSupported()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign these statements')
    } finally {
      setBusy(false)
    }
  }

  const showButton = (canSign || busy) && unsigned.length > 0
  const showConnect = !isConnected && planks.length > 0
  if (!showButton && !showConnect && !result && !error) return null

  return (
    <Stack spacing={1.25} data-testid="selected-plank-support">
      {error && <Alert severity="error">{error}</Alert>}
      {result && <Alert severity="success">{result}</Alert>}
      {showConnect && (
        <ConnectWalletHint>
          Connect a wallet to sign selected statements.
        </ConnectWalletHint>
      )}
      {showButton && (
        <Button
          variant="contained"
          disabled={!canSign}
          onClick={() => void support()}
          data-testid="support-selected-planks"
        >
          {busy ? <CircularProgress size={18} /> : 'Sign selected statements'}
        </Button>
      )}
    </Stack>
  )
}
