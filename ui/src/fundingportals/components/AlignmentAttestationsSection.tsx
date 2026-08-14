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
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { StatementPicker, truncateAddress, useMachinery, useWriteClients } from '../../shared'
import { getAlignmentContract } from './alignmentContract'

type AlignmentWithTitle = AlignmentAttestation & { statementTitle?: string }
type SuccessWithTitle = SuccessAttestation & { statementTitle?: string }

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
  }

  const getClients = () => writeClients

  const statementCid = selectedStatementCid

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
      const txHash = await (attestationKind === 'success' ? attestSuccess : attestAlignment)(
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
      setSubmitError(err instanceof Error ? err.message : `Failed to attest ${attestationKind}`)
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
                <Chip label="Direct" size="small" color="primary" variant="outlined" aria-label="Direct vouch: a person vouched this project serves this cause, not an implication-derived link." />
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
                <Chip label="Delivered" size="small" color="success" variant="outlined" />
              </Box>
            ))}
          </Stack>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{attestationKind === 'success' ? 'Attest Project Success' : 'Vouch for This Project'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>
            {attestationKind === 'success' ? 'Attest that this project delivered real value aligned with a cause.' : 'Vouch that this project serves a particular cause.'}{initialStatementCid ? ' The cause you came from has been pre-selected.' : ''}
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
          <StatementPicker
            intent="alignment"
            selectedCid={statementCid}
            disabled={submitting}
            onSelect={(selection) => setSelectedStatementCid(selection.cid)}
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
            disabled={submitting || !statementCid}
          >
            {submitting ? 'Submitting...' : attestationKind === 'success' ? 'Submit Success Attestation' : 'Submit Vouch'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
