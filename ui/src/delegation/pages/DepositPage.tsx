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
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { parseEther, isAddress } from 'viem'
import {
  depositETH,
  delegateNote,
  attestNoteIntent,
  DelegatableNotesAbi,
  NoteIntentAbi,
  browseStatementsByNewest,
  type TestClients,
  type DelegatableNotesContract,
  type NoteIntentContract,
  type StatementListItem,
} from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { truncateAddress } from '../utils'

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

export function DepositPage() {
  const navigate = useNavigate()
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const machinery = useMachinery()

  const [amount, setAmount] = useState('')
  const [delegateTo, setDelegateTo] = useState('')
  const [selectedStatement, setSelectedStatement] = useState<StatementListItem | null>(null)
  const [statements, setStatements] = useState<StatementListItem[]>([])
  const [statementsLoading, setStatementsLoading] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successNoteId, setSuccessNoteId] = useState<bigint | null>(null)

  const getClients = (): TestClients | null => {
    if (!walletClient || !publicClient || !address) return null
    return {
      walletClient: walletClient as any,
      publicClient: publicClient as any,
      account: address as `0x${string}`,
    }
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

    if (!clients || !delegationContract) {
      setError('Wallet not connected or contract not configured')
      return
    }

    if (!amount || parseEther(amount) <= 0n) {
      setError('Please enter a valid amount')
      return
    }

    if (delegateTo && !isAddress(delegateTo)) {
      setError('Invalid delegate address')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const depositAmount = parseEther(amount)

      const { noteId } = await depositETH(clients, delegationContract, {
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
                onClick={() => navigate(`/notes/${successNoteId}`)}
              >
                View Fund Details
              </Button>
              <Button variant="outlined" onClick={() => navigate('/notes')}>
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
              label="Amount (ETH)"
              type="number"
              inputProps={{ step: '0.001', min: '0' }}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
              required
              disabled={submitting}
              helperText="How much ETH to put in"
            />

            <TextField
              label="Delegate to (optional)"
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
                  label="Intended statement (optional)"
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
                disabled={submitting || !amount || (!!delegateTo && !isAddress(delegateTo))}
              >
                {submitting ? 'Processing...' : 'Deposit'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/notes')}
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
