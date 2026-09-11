import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { getStatement } from '@commonality/sdk/conceptspace'
import { getSubjectStatements, attestAlignment, attestSuccess, getSubjectSuccessStatements, toSubjectId, PROJECT_ALIGNMENT_TOPIC, type AlignmentAttestation, type SuccessAttestation } from '@commonality/sdk/fundingportals'
import { waitForIndexerToSyncToTxHash } from '@commonality/sdk/indexer-sync'
import { cidToBytes32, readHasAlignment, type IpfsCidV1 } from '@commonality/sdk/utils'
import { InfoChip, StatementPicker, truncateAddress, useMachinery, useWriteClients } from '../../shared'
import { getAlignmentContract } from './alignmentContract'

type AlignmentWithTitle = AlignmentAttestation & { statementTitle?: string }
type SuccessWithTitle = SuccessAttestation & { statementTitle?: string }

type QueueStatus = 'queued' | 'already' | 'submitting' | 'done' | 'failed'

interface AlignmentQueueItem {
  cid: string
  label?: string
  status: QueueStatus
  error?: string
}

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
  const [successes, setSuccesses] = useState<SuccessWithTitle[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [attestationKind, setAttestationKind] = useState<'alignment' | 'success'>('alignment')
  const [selectedStatementCid, setSelectedStatementCid] = useState('')
  const [alignmentQueue, setAlignmentQueue] = useState<AlignmentQueueItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [attests, successAttests] = await Promise.all([
          getSubjectStatements(machinery, projectAddress),
          getSubjectSuccessStatements(machinery, projectAddress),
        ])
        if (cancelled) return

        const withTitles = await Promise.all(
          attests.map(async (a) => {
            const stmt = await getStatement(machinery, a.statementCid).catch(() => null)
            return { ...a, statementTitle: stmt?.title }
          })
        )
        const successesWithTitles = await Promise.all(
          successAttests.map(async (a) => {
            const stmt = await getStatement(machinery, a.statementCid).catch(() => null)
            return { ...a, statementTitle: stmt?.title }
          })
        )

        if (!cancelled) {
          setAlignments(withTitles)
          setSuccesses(successesWithTitles)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load alignments')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [machinery, projectAddress, refreshKey])

  const handleOpenDialog = (kind: 'alignment' | 'success' = 'alignment') => {
    setAttestationKind(kind)
    setDialogOpen(true)
    setSubmitError(null)
    setSubmitSuccess(false)
    setSelectedStatementCid(initialStatementCid ?? '')
    setAlignmentQueue(
      kind === 'alignment' && initialStatementCid
        ? [{ cid: initialStatementCid, status: 'queued' }]
        : [],
    )
  }

  const getClients = () => writeClients

  const statementCid = selectedStatementCid

  const addToAlignmentQueue = (cid: string, label?: string) => {
    setSelectedStatementCid(cid)
    setAlignmentQueue((current) => {
      if (current.some((item) => item.cid === cid)) return current
      return [...current, { cid, label, status: 'queued' }]
    })
  }

  const updateQueueItem = (cid: string, patch: Partial<AlignmentQueueItem>) => {
    setAlignmentQueue((current) =>
      current.map((item) => (item.cid === cid ? { ...item, ...patch } : item)),
    )
  }

  const submitAlignmentCid = async (cid: string) => {
    const clients = getClients()
    const contract = getAlignmentContract()
    if (!clients || !contract || !address) {
      throw new Error('Wallet not connected or contract not configured (VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS)')
    }
    const subjectId = toSubjectId(projectAddress as `0x${string}`)
    const already = await readHasAlignment(
      machinery,
      contract.address,
      address,
      cidToBytes32(PROJECT_ALIGNMENT_TOPIC),
      subjectId,
      cidToBytes32(cid),
    )
    if (already) {
      updateQueueItem(cid, { status: 'already', error: undefined })
      return
    }
    updateQueueItem(cid, { status: 'submitting', error: undefined })
    const txHash = await attestAlignment(
      clients,
      contract,
      subjectId,
      cid as IpfsCidV1,
      PROJECT_ALIGNMENT_TOPIC,
    )
    await waitForIndexerToSyncToTxHash(machinery, clients.publicClient, txHash)
    updateQueueItem(cid, { status: 'done' })
  }

  const handleSubmitAlignments = async (cids: string[]) => {
    const clients = getClients()
    const contract = getAlignmentContract()
    if (!clients || !contract) {
      setSubmitError('Wallet not connected or contract not configured (VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS)')
      return
    }
    if (cids.length === 0) {
      setSubmitError('Please select at least one statement')
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    let anyDone = false
    try {
      for (const cid of cids) {
        try {
          await submitAlignmentCid(cid)
          anyDone = true
        } catch (err) {
          console.error('Attestation failed:', err)
          updateQueueItem(cid, {
            status: 'failed',
            error: err instanceof Error ? err.message : 'Failed to attest alignment',
          })
        }
      }
      if (anyDone) {
        setSubmitSuccess(true)
        setRefreshKey(k => k + 1)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    if (attestationKind === 'alignment') {
      const pending = alignmentQueue
        .filter((item) => item.status === 'queued' || item.status === 'failed')
        .map((item) => item.cid)
      await handleSubmitAlignments(pending)
      return
    }

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
      const txHash = await attestSuccess(
        clients,
        contract,
        toSubjectId(projectAddress as `0x${string}`),
        statementCid as IpfsCidV1,
        PROJECT_ALIGNMENT_TOPIC,
      )
      await waitForIndexerToSyncToTxHash(machinery, clients.publicClient, txHash)
      setSubmitSuccess(true)
      setSelectedStatementCid('')
      setRefreshKey(k => k + 1)
    } catch (err) {
      console.error('Attestation failed:', err)
      setSubmitError(err instanceof Error ? err.message : 'Failed to attest success')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">Project Vouches</Typography>
          {isConnected ? (
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" size="small" onClick={() => handleOpenDialog('alignment')}>
                Vouch for This Project
              </Button>
              <Button variant="outlined" size="small" onClick={() => handleOpenDialog('success')}>
                Attest Success
              </Button>
            </Stack>
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
                <InfoChip
                  label="Direct"
                  size="small"
                  color="primary"
                  variant="outlined"
                  title="A person vouched that this project serves this cause — not an implication-derived link."
                  aria-label="Direct vouch: a person vouched this project serves this cause, not an implication-derived link."
                />
              </Box>
            ))}
          </Stack>
        )}
        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" gutterBottom>Successful at</Typography>
        {successes.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No success attestations yet.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {successes.map((a) => (
              <Box key={`success-${a.attester}-${a.statementCid}`} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Box>
                  <Typography component={RouterLink} to={`/portal/${a.statementCid}`} variant="body1" sx={{ textDecoration: 'none', color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}>
                    {a.statementTitle || `Statement ${a.statementCid.slice(0, 12)}...`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Success vouched by: {truncateAddress(a.attester)}
                  </Typography>
                </Box>
                <InfoChip
                  label="Delivered"
                  size="small"
                  color="success"
                  variant="outlined"
                  title="Someone attested that this project delivered real value aligned with that cause."
                />
              </Box>
            ))}
          </Stack>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{attestationKind === 'success' ? 'Attest Project Success' : 'Vouch for This Project'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>
            {attestationKind === 'success'
              ? 'Attest that this project delivered real value aligned with a cause.'
              : 'Vouch that this project serves one or more statements. Each pair is a separate attestation about this project, not about every activity of the beneficiary. You can skip a statement, retry a failed one, and already-onchain vouches are not submitted again.'}
            {attestationKind === 'alignment' && initialStatementCid ? ' The cause you came from has been added to the list.' : ''}
          </Typography>

          {submitSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {attestationKind === 'success' ? 'Success attestation submitted successfully!' : 'Vouch submitted successfully!'}
            </Alert>
          )}

          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>
              {submitError}
            </Alert>
          )}

          {initialStatementCid && statementCid === initialStatementCid && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Selected immutable statement CID: {initialStatementCid}
            </Alert>
          )}
          {attestationKind === 'alignment' && alignmentQueue.length > 0 && (
            <Stack spacing={1} sx={{ mb: 2 }}>
              {alignmentQueue.map((item) => (
                <Box
                  key={item.cid}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    p: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Box>
                    <Typography variant="body2">
                      {item.label || `Statement ${item.cid.slice(0, 12)}...`}
                    </Typography>
                    {item.error && (
                      <Typography variant="caption" color="error">{item.error}</Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      size="small"
                      label={
                        item.status === 'queued' ? 'Pending'
                          : item.status === 'already' ? 'Already attested'
                            : item.status === 'submitting' ? 'Submitting'
                              : item.status === 'done' ? 'Completed'
                                : 'Failed'
                      }
                      color={
                        item.status === 'done' || item.status === 'already' ? 'success'
                          : item.status === 'failed' ? 'error'
                            : item.status === 'submitting' ? 'info'
                              : 'default'
                      }
                    />
                    {item.status === 'failed' && (
                      <Button
                        size="small"
                        disabled={submitting}
                        onClick={() => void handleSubmitAlignments([item.cid])}
                      >
                        Retry
                      </Button>
                    )}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
          <StatementPicker
            intent="alignment"
            selectedCid={statementCid}
            excludeCids={attestationKind === 'alignment' ? alignmentQueue.map((item) => item.cid) : []}
            disabled={submitting}
            onSelect={(selection) => {
              if (attestationKind === 'alignment') {
                addToAlignmentQueue(selection.cid, selection.text)
              } else {
                setSelectedStatementCid(selection.cid)
              }
            }}
            onNoneFit={() => window.open('/#/', '_blank', 'noopener,noreferrer')}
          />
          {statementCid && (
            <Button
              component="a"
              href={`mailto:?subject=${encodeURIComponent('Please review this project alignment')}&body=${encodeURIComponent(`Please independently review whether project ${projectAddress} advances immutable statement ${statementCid}. Open ${window.location.href} to vouch only if you agree.`)}`}
              sx={{ mt: 1 }}
            >
              Invite a trusted attester to review
            </Button>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={
              submitting
              || (attestationKind === 'success' ? !statementCid : alignmentQueue.every((item) => item.status !== 'queued' && item.status !== 'failed'))
            }
          >
            {submitting
              ? 'Submitting...'
              : attestationKind === 'success'
                ? 'Submit Success Attestation'
                : 'Confirm alignment attestations'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
