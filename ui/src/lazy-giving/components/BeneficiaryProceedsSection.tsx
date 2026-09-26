import { Alert, Button, Paper, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import {
  claimIdentityProceeds,
  noteIdentityProceedsSuccess,
  reclaimUnclaimedProceeds,
  refuseIdentityProceeds,
} from '@commonality/sdk/lazy-giving'
import { useWriteClients } from '../../shared'

export function BeneficiaryProceedsSection({
  projectAddress,
  address,
  succeeded,
  onRefresh,
}: {
  projectAddress: `0x${string}`
  address: string | undefined
  succeeded: boolean
  onRefresh: () => void
}) {
  const writeClients = useWriteClients(address)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const run = async (label: string, action: () => Promise<unknown>, success: string) => {
    if (!writeClients || !address) return
    try {
      setPending(label)
      setError(null)
      setNotice(null)
      await action()
      setNotice(success)
      onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed')
    } finally {
      setPending(null)
    }
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Funds held for this name
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        This project holds its own funds. Proving control of the name and registering a payout
        address does not accept this money. The current payout address can claim this project or
        refuse it. Claiming or refusing here does not move any other project. If nobody claims
        within 90 days after success is noted, contributors can reclaim the surplus.
      </Typography>
      {succeeded && (
        <Button
          sx={{ mb: 2 }}
          variant="outlined"
          disabled={!address || pending !== null}
          onClick={() => run(
            'note',
            () => noteIdentityProceedsSuccess(writeClients!, projectAddress),
            'Success noted. The 90-day unclaimed window has started.',
          )}
        >
          {pending === 'note' ? 'Noting...' : 'Note success and start the unclaimed window'}
        </Button>
      )}
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          disabled={!address || pending !== null}
          onClick={() => run(
            'claim',
            () => claimIdentityProceeds(writeClients!, projectAddress),
            'This project was claimed. No other project was moved.',
          )}
        >
          {pending === 'claim' ? 'Claiming...' : 'Claim this project'}
        </Button>
        <Button
          variant="outlined"
          color="warning"
          disabled={!address || pending !== null}
          onClick={() => run(
            'refuse',
            () => refuseIdentityProceeds(writeClients!, projectAddress),
            'This project was refused. Contributors can take back what this project owes them.',
          )}
        >
          {pending === 'refuse' ? 'Refusing...' : 'Refuse this project'}
        </Button>
        <Button
          variant="text"
          disabled={!address || pending !== null}
          onClick={() => run(
            'reclaim',
            () => reclaimUnclaimedProceeds(writeClients!, projectAddress),
            'Your share of this project was returned.',
          )}
        >
          {pending === 'reclaim' ? 'Reclaiming...' : 'Reclaim my unclaimed share'}
        </Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mt: 2 }}>{notice}</Alert>}
    </Paper>
  )
}
