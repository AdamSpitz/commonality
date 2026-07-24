import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import type { AssuranceContract, ContributorReimbursementState, Project, ProjectReimbursementState } from '@commonality/sdk/lazy-giving'
import { donateRetroactive, forgoReimbursement, withdrawReimbursement } from '@commonality/sdk/lazy-giving'
import { AssuranceContractAbi } from '@commonality/sdk/abis'
import { parseUnits } from 'viem'
import { useState } from 'react'
import { formatCurrencyAmount, humanizeTxError, useWriteClients } from '../../shared'

interface ReimbursementSectionProps {
  project: Project
  projectState: ProjectReimbursementState
  contributorState?: ContributorReimbursementState
  address: string | undefined
  onRefresh: () => void | Promise<void>
}

export function ReimbursementSection({ project, projectState, contributorState, address, onRefresh }: ReimbursementSectionProps) {
  const writeClients = useWriteClients(address)
  const [donationAmount, setDonationAmount] = useState('')
  const [forgoAmount, setForgoAmount] = useState('')
  const [pending, setPending] = useState<'donate' | 'withdraw' | 'forgo' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const currency = projectState.currency
  const outstanding = BigInt(projectState.outstandingReimbursement)
  const reimbursable = BigInt(contributorState?.reimbursableAmount ?? '0')
  const remainingClaim = BigInt(contributorState?.earlyContribution ?? '0')
  const maxForgo = remainingClaim < outstanding ? remainingClaim : outstanding
  const contract: AssuranceContract = { address: project.id as `0x${string}`, abi: AssuranceContractAbi }

  const run = async (kind: 'donate' | 'withdraw' | 'forgo', action: () => Promise<unknown>, message: string) => {
    try {
      setPending(kind)
      setError(null)
      setSuccess(null)
      await action()
      setSuccess(message)
      setDonationAmount('')
      setForgoAmount('')
      await onRefresh()
    } catch (cause) {
      setError(humanizeTxError(cause, 'The reimbursement transaction failed'))
    } finally {
      setPending(null)
    }
  }

  const handleDonate = async () => {
    if (!writeClients) return
    let amount: bigint
    try { amount = parseUnits(donationAmount, currency.decimals) } catch { setError('Enter a valid donation amount.'); return }
    if (amount <= 0n || amount > outstanding) { setError(`Enter an amount no greater than ${formatCurrencyAmount(outstanding, currency)}.`); return }
    await run('donate', () => donateRetroactive(writeClients, contract, amount), 'Donation sent. Early contributors can now claim their pro-rata reimbursement.')
  }

  const handleForgo = async () => {
    if (!writeClients) return
    let amount: bigint
    try { amount = parseUnits(forgoAmount, currency.decimals) } catch { setError('Enter a valid amount to forgo.'); return }
    if (amount <= 0n || amount > maxForgo) { setError(`Enter an amount no greater than ${formatCurrencyAmount(maxForgo, currency)}.`); return }
    await run('forgo', () => forgoReimbursement(writeClients, contract, amount), 'Reimbursement permanently forgone. Your recognition receipt is unchanged.')
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>Close the loop</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Early contributors are still out {formatCurrencyAmount(outstanding, currency)}. Donate to reimburse them pro-rata, at cost, so they can fund the next project.
      </Typography>
      {outstanding > 0n ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
          <TextField label={`Donation (${currency.symbol})`} value={donationAmount} onChange={(event) => setDonationAmount(event.target.value)} size="small" />
          <Button variant="contained" onClick={handleDonate} disabled={!writeClients || pending !== null || !donationAmount}>Donate to close the loop</Button>
        </Stack>
      ) : <Alert severity="success" sx={{ mb: 2 }}>The loop is closed: early contributors have been fully reimbursed.</Alert>}

      {contributorState && remainingClaim > 0n && (
        <Stack spacing={1} sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">Your scout reimbursement</Typography>
          <Typography variant="body2">Available now: {formatCurrencyAmount(reimbursable, currency)} · Remaining basis: {formatCurrencyAmount(remainingClaim, currency)}</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button variant="outlined" onClick={() => writeClients && run('withdraw', () => withdrawReimbursement(writeClients, contract), 'Reimbursement withdrawn.')} disabled={!writeClients || reimbursable === 0n || pending !== null}>Withdraw reimbursement</Button>
            <TextField label={`Amount to forgo (${currency.symbol})`} value={forgoAmount} onChange={(event) => setForgoAmount(event.target.value)} size="small" disabled={maxForgo === 0n} />
            <Button color="inherit" onClick={handleForgo} disabled={!writeClients || pending !== null || !forgoAmount || maxForgo === 0n}>Forgo reimbursement</Button>
          </Stack>
          <Typography variant="caption" color="text.secondary">Forgoing is permanent and does not remove your recognition receipt.</Typography>
        </Stack>
      )}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
    </Paper>
  )
}
