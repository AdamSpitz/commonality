import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Divider,
  Button,
  TextField,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useAccount } from 'wagmi'
import {
  getSubjectStatements,
  getStatement,
  getAllStatements,
  attestAlignment,
  toSubjectId,
  PROJECT_ALIGNMENT_TOPIC,
  waitForIndexerToSyncToTxHash,
  type AlignmentAttestation,
  type StatementListItem,
  type IpfsCidV1,
} from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { useWriteClients } from '../../shared/hooks/useWriteClients'
import { truncateAddress } from '../../delegation/utils'
import { getAlignmentContract } from './alignmentContract'

type AlignmentWithTitle = AlignmentAttestation & { statementTitle?: string }

interface Props {
  projectAddress: string
  initialStatementCid?: string
}

export function AlignmentAttestationsSection({ projectAddress, initialStatementCid }: Props) {
  const machinery = useMachinery()
  const { address, isConnected } = useAccount()
  const writeClients = useWriteClients(address)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [alignments, setAlignments] = useState<AlignmentWithTitle[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [statements, setStatements] = useState<StatementListItem[]>([])
  const [statementsLoading, setStatementsLoading] = useState(false)
  const [selectedStatement, setSelectedStatement] = useState<StatementListItem | string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const attests = await getSubjectStatements(machinery, projectAddress)
        if (cancelled) return

        const withTitles = await Promise.all(
          attests.map(async (a) => {
            const stmt = await getStatement(machinery, a.statementCid).catch(() => null)
            return { ...a, statementTitle: stmt?.title }
          })
        )

        if (!cancelled) setAlignments(withTitles)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load alignments')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [machinery, projectAddress, refreshKey])

  const handleOpenDialog = () => {
    setDialogOpen(true)
    setSubmitError(null)
    setSubmitSuccess(false)
    setSelectedStatement(initialStatementCid ?? null)
    setStatementsLoading(true)
    getAllStatements(machinery)
      .then(setStatements)
      .catch(err => console.warn('Failed to load statements:', err))
      .finally(() => setStatementsLoading(false))
  }

  const getClients = () => writeClients

  const statementCid =
    typeof selectedStatement === 'string'
      ? selectedStatement
      : selectedStatement?.cid ?? ''

  const handleSubmit = async () => {
    const clients = getClients()
    const contract = getAlignmentContract()

    if (!clients || !contract) {
      setSubmitError('Wallet not connected or contract not configured (VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS)')
      return
    }

    if (!statementCid) {
      setSubmitError('Please select a statement')
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      const txHash = await attestAlignment(
        clients,
        contract,
        toSubjectId(projectAddress as `0x${string}`),
        statementCid as IpfsCidV1,
        PROJECT_ALIGNMENT_TOPIC,
      )
      await waitForIndexerToSyncToTxHash(machinery, clients.publicClient, txHash)
      setSubmitSuccess(true)
      setSelectedStatement(null)
      setRefreshKey(k => k + 1)
    } catch (err) {
      console.error('Attestation failed:', err)
      setSubmitError(err instanceof Error ? err.message : 'Failed to attest alignment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">Project Endorsements</Typography>
          {isConnected ? (
            <Button variant="outlined" size="small" onClick={handleOpenDialog}>
              Vouch for This Project
            </Button>
          ) : (
            <Button variant="outlined" size="small" disabled>
              Connect wallet to vouch
            </Button>
          )}
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : alignments.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No alignment attestations yet.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {alignments.map((a) => (
              <Box
                key={`${a.attester}-${a.statementCid}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <Box>
                  <Typography
                    component={RouterLink}
                    to={`/portal/${a.statementCid}`}
                    variant="body1"
                    sx={{ textDecoration: 'none', color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
                  >
                    {a.statementTitle || `Statement ${a.statementCid.slice(0, 12)}...`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Vouched by: {truncateAddress(a.attester)}
                  </Typography>
                </Box>
                <Chip label="Direct" size="small" color="primary" variant="outlined" />
              </Box>
            ))}
          </Stack>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Vouch for This Project</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>
            Vouch that this project serves a particular cause.{initialStatementCid ? ' The cause you came from has been pre-selected.' : ''}
          </Typography>

          {submitSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Vouch submitted successfully!
            </Alert>
          )}

          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>
              {submitError}
            </Alert>
          )}

          <Autocomplete<StatementListItem, false, false, true>
            freeSolo
            options={statements}
            loading={statementsLoading}
            getOptionLabel={(option) =>
              typeof option === 'string' ? option : (option.title || option.cid)
            }
            value={selectedStatement}
            onChange={(_, newValue) => setSelectedStatement(newValue)}
            disabled={submitting}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Statement"
                placeholder="Search for a cause statement"
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
                    <Typography variant="body2">{option.title || option.cid}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      {option.cid}
                    </Typography>
                  </Box>
                </li>
              )
            }}
            isOptionEqualToValue={(option, value) =>
              typeof value === 'string' ? option.cid === value : option.cid === value.cid
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || !statementCid}
          >
            {submitting ? 'Submitting...' : 'Submit Vouch'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
