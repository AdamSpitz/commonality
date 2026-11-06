import { Alert, Button, Paper, Stack, Typography } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { acceptWorkProject, getProjectWorkState, releaseFailedProjectWork, vetoWorkProject, type ProjectWorkState } from '@commonality/sdk/lazy-giving'
import { getRuntimeConfigValue, useMachinery, useWriteClients } from '../../shared'

export function WorkProposalSection({ projectAddress, address, onRefresh }: {
  projectAddress: `0x${string}`
  address: string | undefined
  onRefresh: () => void
}) {
  const machinery = useMachinery()
  const clients = useWriteClients(address)
  const factory = getRuntimeConfigValue('VITE_PROJECT_FACTORY_CONTRACT_ADDRESS') as `0x${string}` | undefined
  const [state, setState] = useState<ProjectWorkState | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const refresh = useCallback(async () => {
    if (!factory) return
    try {
      setState(await getProjectWorkState(machinery, factory, projectAddress))
    } catch {
      setError('Could not read the work proposal status. Refresh to try again.')
    }
  }, [factory, machinery, projectAddress])
  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 30_000)
    return () => window.clearInterval(timer)
  }, [refresh])
  const run = async (action: 'accept' | 'veto' | 'release') => {
    if (!factory || !clients) return
    setPending(true)
    setError(null)
    try {
      const execute = action === 'accept' ? acceptWorkProject : action === 'veto' ? vetoWorkProject : releaseFailedProjectWork
      await execute(clients, factory, projectAddress)
      await refresh()
      onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed')
    } finally {
      setPending(false)
    }
  }
  if (!state) return error ? <Alert severity="warning" sx={{ mb: 3 }}>{error}</Alert> : null
  if (!state.thirdParty && !(state.failed && state.reservationActive)) return null
  const beneficiary = !!address && state.beneficiaryAddress.toLowerCase() === address.toLowerCase()
  const vetoEnds = Number(state.acceptedAt + state.vetoWindow) * 1000
  const vetoOpen = state.acceptedAt === 0n || state.timestamp <= state.acceptedAt + state.vetoWindow
  const canVeto = !state.failed && !state.succeeded && vetoOpen
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>{state.thirdParty ? 'Third-party work proposal' : 'Work reservations'}</Typography>
      <Typography sx={{ mb: 2 }}>
        {state.cancelled ? 'The beneficiary vetoed this proposal. Its work items are available for another request.'
          : state.failed ? 'This proposal expired or failed. Contributors can request refunds.'
          : state.acceptedAt === 0n ? 'The beneficiary must accept this proposal before it can succeed. After acceptance, they have seven days to veto it. That window must finish before the funding deadline. If the proposal expires, contributors can request refunds even if the funding goal was reached.'
          : !state.succeeded && vetoOpen ? `The beneficiary accepted this proposal. The veto window ends ${new Date(vetoEnds).toLocaleString()}.`
          : 'The beneficiary accepted this proposal and its veto window has ended.'}
      </Typography>
      {state.failed && state.reservationActive && (
        <Button disabled={!address || pending} variant="outlined" onClick={() => void run('release')} sx={{ mb: 2 }}>Release work items for another attempt</Button>
      )}
      {!beneficiary && state.acceptedAt === 0n && !state.failed && (
        <Typography variant="body2" sx={{ mb: 2 }}>For a named beneficiary, prove control of the identity below, then use its payout wallet to accept or veto.</Typography>
      )}
      {beneficiary && !state.failed && !state.succeeded && (
        <Stack direction="row" spacing={1}>
          {state.acceptedAt === 0n && <Button disabled={pending} variant="contained" onClick={() => void run('accept')}>Accept work proposal</Button>}
          {canVeto && <Button disabled={pending} variant="outlined" color="warning" onClick={() => void run('veto')}>Veto work proposal</Button>}
        </Stack>
      )}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </Paper>
  )
}
