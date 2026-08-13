import { useState, useEffect, useCallback } from 'react'
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
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAccount, usePublicClient } from 'wagmi'
import { parseUnits, isAddress } from 'viem'
import { DelegatableNotesAbi, NoteIntentAbi, RecurringPledgesAbi } from '@commonality/sdk/abis'
import { browseStatementsByNewest, getStatementWithContent, type StatementListItem } from '@commonality/sdk/conceptspace'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { depositERC20, delegateNote, attestNoteIntent, approveRecurringPledgeToken, createStandingPledge, type DelegatableNotesContract, type NoteIntentContract, type RecurringPledgesContract } from '@commonality/sdk/delegation'
import { useMachinery } from '../../shared'
import { noteDetailPathFor } from '../utils'
import { useWriteClients } from '../../shared'
import { truncateAddress } from '../utils'
import { DEFAULT_PAYMENT_CURRENCY, getConfiguredPaymentCurrency } from '../../shared'
import { usePaymentTokenCurrency } from '../../shared'
import { AddressPicker, type AddressPickerStatus } from '../../shared'

function getDelegationContract(): DelegatableNotesContract | null {
  const addr = import.meta.env.VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS
  if (!addr) return null
  return { address: addr as `0x${string}`, abi: DelegatableNotesAbi }
}

function getRecurringPledgesContract(): RecurringPledgesContract | null {
  const addr = import.meta.env.VITE_RECURRING_PLEDGES_CONTRACT_ADDRESS
  if (!addr) return null
  return { address: addr as `0x${string}`, abi: RecurringPledgesAbi }
}

function getNoteIntentContract(): NoteIntentContract | null {
  const addr = import.meta.env.VITE_NOTE_INTENT_CONTRACT_ADDRESS
  return addr ? { address: addr as `0x${string}`, abi: NoteIntentAbi } : null
}

const MONTHLY_PERIOD_SECONDS = 30n * 24n * 60n * 60n
const DEFAULT_RECURRING_ALLOWANCE_PERIODS = 12n

export function DepositPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const writeClients = useWriteClients(address)
  const machinery = useMachinery()

  const [amount, setAmount] = useState('')
  const [delegateTo, setDelegateTo] = useState('')
  const [delegateStatus, setDelegateStatus] = useState<AddressPickerStatus>('empty')
  const [selectedStatement, setSelectedStatement] = useState<StatementListItem | null>(null)
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringAllowancePeriods, setRecurringAllowancePeriods] = useState(DEFAULT_RECURRING_ALLOWANCE_PERIODS.toString())
  const [statements, setStatements] = useState<StatementListItem[]>([])
  const [statementsLoading, setStatementsLoading] = useState(false)
  const requestedStatementCid = searchParams.get('statement')?.trim() || null

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successNoteId, setSuccessNoteId] = useState<bigint | null>(null)
  const [intentWarning, setIntentWarning] = useState<string | null>(null)
  const paymentTokenAddress = import.meta.env.VITE_PAYMENT_TOKEN_ADDRESS
  const { currency: loadedPaymentCurrency, loading: paymentCurrencyLoading } = usePaymentTokenCurrency(publicClient, paymentTokenAddress)
  const paymentCurrency = loadedPaymentCurrency ?? getConfiguredPaymentCurrency() ?? DEFAULT_PAYMENT_CURRENCY
  const paymentSymbol = paymentCurrency.symbol

  // Stable identity: AddressPicker reports its selection through an effect.
  const handleDelegateChange = useCallback(
    (next: `0x${string}` | null, status: AddressPickerStatus) => {
      setDelegateTo(next ?? '')
      setDelegateStatus(status)
    },
    [],
  )

  // Half-typed or unrecognized delegate input must block the deposit rather
  // than fall through as "no delegate".
  const delegateUnsettled = delegateStatus === 'invalid' || delegateStatus === 'resolving'

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
        if (requestedStatementCid && !results.some((statement) => statement.cid === requestedStatementCid)) {
          const requested = await getStatementWithContent(machinery, requestedStatementCid as IpfsCidV1)
          if (requested) {
            results.unshift({
              id: requested.statement.id,
              cid: requested.statement.cid,
              statementType: requested.statement.statementType ?? '',
              title: requested.statement.title ?? requestedStatementCid,
              excerpt: requested.statement.excerpt ?? '',
              believerCount: requested.statement.believerCount,
              disbelieverCount: requested.statement.disbelieverCount,
              createdAt: requested.statement.createdAt ?? '',
            })
          }
        }
        setStatements(results)
      } catch (err) {
        console.error('Failed to load statements:', err)
      } finally {
        setStatementsLoading(false)
      }
    }
    loadStatements()
  }, [machinery, requestedStatementCid])

  useEffect(() => {
    if (!requestedStatementCid || selectedStatement || statements.length === 0) return
    const requested = statements.find((statement) => statement.cid === requestedStatementCid)
    if (requested) setSelectedStatement(requested)
  }, [requestedStatementCid, selectedStatement, statements])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const clients = getClients()
    const delegationContract = getDelegationContract()
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

      setSuccessNoteId(noteId)
      if (selectedStatement) {
        const noteIntentContract = getNoteIntentContract()
        if (!noteIntentContract) {
          setIntentWarning('The fund was created, but the earmark contract is not configured, so it remains untagged.')
        } else {
          try {
            await attestNoteIntent(clients, noteIntentContract, delegationContract.address, noteId, selectedStatement.cid)
          } catch (intentError) {
            console.error('Earmark failed after deposit:', intentError)
            setIntentWarning('The fund was created, but the earmark transaction did not succeed. You can add it from the fund details page.')
          }
        }
      }
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
        {intentWarning && <Alert severity="warning" sx={{ mb: 3 }}>{intentWarning}</Alert>}
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

            <Box>
              <AddressPicker
                legend={isRecurring ? 'Delegate to' : 'Delegate to (optional)'}
                address={address}
                contactKind="delegate"
                contactOptionLabel="Pick from a saved delegate"
                manualOptionLabel="Enter their address or ENS name"
                emptyContactsHint="No saved delegates yet. Addresses you enter and confirm here are saved so you don't have to re-paste them."
                saveLabelHelperText="A name to save this person as, e.g. “Dana (climate)”"
                manualConfirmWarning="This person will be able to direct this fund. Make sure the address is right."
                onChange={handleDelegateChange}
                disabled={submitting}
              />
              <Typography variant="caption" color="text.secondary">
                {isRecurring
                  ? 'The person you want to let manage this fund.'
                  : 'Optional — leave this alone to manage the fund yourself.'}
              </Typography>
            </Box>

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
                  label={isRecurring ? 'Cause' : 'Cause to earmark for (optional)'}
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
                disabled={submitting || paymentCurrencyLoading || !amount || delegateUnsettled || (isRecurring && parseRecurringAllowancePeriods() === null)}
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
