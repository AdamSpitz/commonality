import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  Stack,
  Autocomplete,
  CircularProgress,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAccount, usePublicClient } from 'wagmi'
import { parseUnits, isAddress } from 'viem'
import {
  depositERC20,
  delegateNote,
  attestNoteIntent,
  DelegatableNotesAbi,
  NoteIntentAbi,
  RecurringPledgesAbi,
  browseStatementsByNewest,
  approveRecurringPledgeToken,
  createStandingPledge,
  type DelegatableNotesContract,
  type NoteIntentContract,
  type RecurringPledgesContract,
  type StatementListItem,
} from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { noteDetailPathFor } from '../utils'
import { useWriteClients } from '../../shared/hooks/useWriteClients'
import { truncateAddress } from '../utils'
import { DEFAULT_PAYMENT_CURRENCY, getConfiguredPaymentCurrency } from '../../shared/currency'
import { usePaymentTokenCurrency } from '../../shared/usePaymentTokenCurrency'

function getDelegationContract(): DelegatableNotesContract | null {
  const addr = import.meta.env.VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS
  if (!addr) return null
  return { address: addr as `0x${string}`, abi: DelegatableNotesAbi }
}

function getNoteIntentContract(): NoteIntentContract | null {
  const addr = import.meta.env.VITE_NOTE_INTENT_CONTRACT_ADDRESS
  if (!addr) return null
  return { address: addr as `0x${string}`, abi: NoteIntentAbi }
}

function getRecurringPledgesContract(): RecurringPledgesContract | null {
  const addr = import.meta.env.VITE_RECURRING_PLEDGES_CONTRACT_ADDRESS
  if (!addr) return null
  return { address: addr as `0x${string}`, abi: RecurringPledgesAbi }
}

const MONTHLY_PERIOD_SECONDS = 30n * 24n * 60n * 60n
const DEFAULT_RECURRING_ALLOWANCE_PERIODS = 12n

export function DepositPage() {
  const navigate = useNavigate()
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const writeClients = useWriteClients(address)
  const machinery = useMachinery()

  const [amount, setAmount] = useState('')
  const [delegateTo, setDelegateTo] = useState('')
  const [selectedStatement, setSelectedStatement] = useState<StatementListItem | null>(null)
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringAllowancePeriods, setRecurringAllowancePeriods] = useState(DEFAULT_RECURRING_ALLOWANCE_PERIODS.toString())
  const [statements, setStatements] = useState<StatementListItem[]>([])
  const [statementsLoading, setStatementsLoading] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successNoteId, setSuccessNoteId] = useState<bigint | null>(null)
  const paymentTokenAddress = import.meta.env.VITE_PAYMENT_TOKEN_ADDRESS
  const { currency: loadedPaymentCurrency, loading: paymentCurrencyLoading } = usePaymentTokenCurrency(publicClient, paymentTokenAddress)
  const paymentCurrency = loadedPaymentCurrency ?? getConfiguredPaymentCurrency() ?? DEFAULT_PAYMENT_CURRENCY
  const paymentSymbol = paymentCurrency.symbol

  const parsePaymentAmount = (value: string) => {
    return parseUnits(value, paymentCurrency.decimals)
  }

  const parseRecurringAllowancePeriods = () => {
    if (!/^\d+$/.test(recurringAllowancePeriods)) return null
    const periods = BigInt(recurringAllowancePeriods)
    return periods > 0n ? periods : null
  }

  const getClients = () => {
    if (!writeClients || !address) return null
    return writeClients
  }

  useEffect(() => {
    const loadStatements = async () => {
      setStatementsLoading(true)
      try {
        const results = await browseStatementsByNewest(machinery, { limit: 50 })
        setStatements(results)
      } catch (err) {
        console.error('Failed to load statements:', err)
      } finally {
        setStatementsLoading(false)
      }
    }
    loadStatements()
  }, [machinery])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const clients = getClients()
    const delegationContract = getDelegationContract()
    const noteIntentContract = getNoteIntentContract()
    const recurringPledgesContract = getRecurringPledgesContract()

    if (!clients || !delegationContract) {
      setError('Wallet not connected or contract not configured')
      return
    }

    if (!paymentTokenAddress) {
      setError('Payment token address not configured (VITE_PAYMENT_TOKEN_ADDRESS)')
      return
    }

    if (!amount || parsePaymentAmount(amount) <= 0n) {
      setError('Please enter a valid amount')
      return
    }

    if (delegateTo && !isAddress(delegateTo)) {
      setError('Invalid delegate address')
      return
    }

    if (isRecurring && !recurringPledgesContract) {
      setError('Recurring pledges contract not configured (VITE_RECURRING_PLEDGES_CONTRACT_ADDRESS)')
      return
    }

    if (isRecurring && !delegateTo) {
      setError('Recurring pledges need a delegate address')
      return
    }

    if (isRecurring && !selectedStatement) {
      setError('Recurring pledges need an intended statement/cause')
      return
    }

    const allowancePeriods = isRecurring ? parseRecurringAllowancePeriods() : null
    if (isRecurring && allowancePeriods === null) {
      setError('Please choose how many monthly payments to authorize')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const depositAmount = parsePaymentAmount(amount)

      if (isRecurring) {
        await approveRecurringPledgeToken(clients, {
          token: paymentTokenAddress as `0x${string}`,
          delegatableNotes: delegationContract.address,
          amount: depositAmount * allowancePeriods!,
        })
        const { firstNoteId } = await createStandingPledge(clients, recurringPledgesContract!, {
          delegateTo: delegateTo as `0x${string}`,
          token: paymentTokenAddress as `0x${string}`,
          amountPerPeriod: depositAmount,
          period: MONTHLY_PERIOD_SECONDS,
          causeRef: selectedStatement!.cid,
        })
        setSuccessNoteId(firstNoteId)
        return
      }

      const { noteId } = await depositERC20(clients, delegationContract, {
        token: paymentTokenAddress as `0x${string}`,
        amount: depositAmount,
      })

      if (delegateTo && isAddress(delegateTo)) {
        await delegateNote(clients, delegationContract, {
          noteId,
          owners: [address as `0x${string}`],
          delegateTo: delegateTo as `0x${string}`,
          amount: depositAmount,
        })
      }

      if (selectedStatement && noteIntentContract) {
        await attestNoteIntent(clients, noteIntentContract, delegationContract.address, noteId, selectedStatement.cid)
      }

      setSuccessNoteId(noteId)
    } catch (err) {
      console.error('Deposit failed:', err)
      setError(err instanceof Error ? err.message : 'Deposit failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (!address) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Add Delegated Funds
        </Typography>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Connect your wallet to add delegated funds.
          </Typography>
        </Paper>
      </Box>
    )
  }

  if (successNoteId !== null) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Funds Added
        </Typography>
        <Alert severity="success" sx={{ mb: 3 }}>
          Your delegated fund has been created successfully!
        </Alert>
        <Card>
          <CardContent>
            <Typography variant="body1" gutterBottom>
              Fund ID: {successNoteId.toString()}
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                onClick={() => {
                  const contract = getDelegationContract()
                  navigate(contract ? noteDetailPathFor(contract.address, successNoteId) : `/delegation/notes/${successNoteId}`)
                }}
              >
                View Fund Details
              </Button>
              <Button variant="outlined" onClick={() => navigate('/delegation/notes')}>
                Back to My Delegated Funds
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Add Delegated Funds
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          This creates a delegatable fund — a pool of money that you or a trusted delegate
          can use to fund projects aligned with a cause. You can delegate the decision to
          someone you trust, or direct it yourself.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {submitting && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Transaction in progress... Please confirm in your wallet.
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              label={`Amount (${paymentSymbol})`}
              type="number"
              inputProps={{ step: '0.001', min: '0' }}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
              required
              disabled={submitting}
              helperText={`How much ${paymentSymbol} to put in`}
            />

            <FormControlLabel
              control={(
                <Checkbox
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  disabled={submitting}
                />
              )}
              label="Make this a monthly recurring pledge"
            />

            {isRecurring && (
              <TextField
                label="Authorize monthly payments"
                type="number"
                inputProps={{ step: '1', min: '1' }}
                value={recurringAllowancePeriods}
                onChange={(e) => setRecurringAllowancePeriods(e.target.value)}
                fullWidth
                required
                disabled={submitting}
                error={parseRecurringAllowancePeriods() === null}
                helperText={`Your wallet will approve ${recurringAllowancePeriods || '0'} monthly ${paymentSymbol} payment${recurringAllowancePeriods === '1' ? '' : 's'}. You can cancel the pledge or revoke allowance anytime.`}
              />
            )}

            <TextField
              label={isRecurring ? 'Delegate to' : 'Delegate to (optional)'}
              value={delegateTo}
              onChange={(e) => setDelegateTo(e.target.value)}
              fullWidth
              disabled={submitting}
              placeholder="0x..."
              error={!!delegateTo && !isAddress(delegateTo)}
              helperText={
                delegateTo && !isAddress(delegateTo)
                  ? 'Invalid wallet address'
                  : 'Wallet address of the person you want to let manage this fund'
              }
              required={isRecurring}
            />

            <Autocomplete
              options={statements}
              loading={statementsLoading}
              getOptionLabel={(option) => option.title || truncateAddress(option.cid)}
              value={selectedStatement}
              onChange={(_, newValue) => setSelectedStatement(newValue)}
              disabled={submitting}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={isRecurring ? 'Intended statement/cause' : 'Intended statement (optional)'}
                  placeholder="Search for a cause or project"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {statementsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => {
                const { key, ...rest } = props
                return (
                  <li key={key} {...rest}>
                    <Box>
                      <Typography variant="body2">
                        {option.title || truncateAddress(option.cid)}
                      </Typography>
                      {option.excerpt && (
                        <Typography variant="caption" color="text.secondary">
                          {option.excerpt.slice(0, 100)}
                          {option.excerpt.length > 100 ? '...' : ''}
                        </Typography>
                      )}
                    </Box>
                  </li>
                )
              }}
              isOptionEqualToValue={(option, value) => option.cid === value.cid}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting || paymentCurrencyLoading || !amount || (!!delegateTo && !isAddress(delegateTo)) || (isRecurring && parseRecurringAllowancePeriods() === null)}
              >
                {submitting ? 'Processing...' : isRecurring ? 'Start Monthly Pledge' : 'Deposit'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/delegation/notes')}
                disabled={submitting}
              >
                Cancel
              </Button>
            </Box>
          </Stack>
        </form>
      </Paper>
    </Box>
  )
}
