import { useState } from 'react'
import {
  Alert,
  Button,
  CircularProgress,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material'
import { useAccount } from 'wagmi'
import { BeliefsAbi } from '@commonality/sdk/abis'
import { believeStatement, type BeliefsContract } from '@commonality/sdk/conceptspace'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { useWriteClients } from '../lib/useWriteClients'
import { getRuntimeConfigValue } from '../lib/runtimeConfig'
import { NeedLogin, useCanSignChain } from './NeedLogin'

interface SupportAllGoalsProps {
  /** Published goal CIDs to support in sequence. */
  goalCids: string[]
  labels?: string[]
}

/**
 * Tranche-style support: stand with every published goal in an aggregate.
 */
export function SupportAllGoals({ goalCids, labels }: SupportAllGoalsProps) {
  const { address } = useAccount()
  const canSign = useCanSignChain()
  const writeClients = useWriteClients(address)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)

  const beliefsAddress = (
    getRuntimeConfigValue('VITE_BELIEFS_CONTRACT_ADDRESS')
    || import.meta.env.VITE_BELIEFS_CONTRACT_ADDRESS
  ) as `0x${string}` | undefined

  if (goalCids.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No published goals in this bundle yet. Open each cause and publish its goal first.
      </Typography>
    )
  }

  const run = async () => {
    if (!writeClients || !beliefsAddress) {
      setError('Connect a wallet and ensure Beliefs is configured.')
      return
    }
    setBusy(true)
    setError(null)
    setSummary(null)
    setDone(0)
    const beliefs: BeliefsContract = { address: beliefsAddress, abi: BeliefsAbi }
    let ok = 0

    for (let i = 0; i < goalCids.length; i++) {
      const cid = goalCids[i]! as IpfsCidV1
      try {
        await believeStatement(writeClients, beliefs, cid)
        ok += 1
        setDone(i + 1)
      } catch (err) {
        setError(
          `Stopped at goal ${i + 1}`
          + (labels?.[i] ? ` (“${labels[i]!.slice(0, 40)}…”)` : '')
          + `: ${err instanceof Error ? err.message : 'tx failed'}`,
        )
        setBusy(false)
        return
      }
    }

    setSummary(`Supported ${ok} goal${ok === 1 ? '' : 's'} in this aggregate.`)
    setBusy(false)
  }

  return (
    <Stack spacing={1.25} data-testid="support-all-goals">
      <Typography variant="body2" color="text.secondary">
        Support the whole tranche: record stand-with for each published goal ({goalCids.length}).
      </Typography>
      {!canSign ? (
        <NeedLogin action="support these goals" needWallet />
      ) : (
        <Button
          variant="contained"
          disabled={busy}
          onClick={() => void run()}
          sx={{ alignSelf: 'flex-start', borderRadius: 999, textTransform: 'none', fontWeight: 700, minHeight: 44 }}
        >
          {busy ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={16} color="inherit" />
              <span>Supporting {done}/{goalCids.length}…</span>
            </Stack>
          ) : (
            `Support all published goals (${goalCids.length})`
          )}
        </Button>
      )}
      {busy && (
        <LinearProgress
          variant="determinate"
          value={(done / goalCids.length) * 100}
          sx={{ borderRadius: 1 }}
        />
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {summary && <Alert severity="success">{summary}</Alert>}
    </Stack>
  )
}
