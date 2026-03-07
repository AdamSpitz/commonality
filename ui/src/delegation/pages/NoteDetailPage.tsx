import { useState, useEffect } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Stack,
  Button,
  Chip,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { formatEther, parseEther } from 'viem'
import {
  getNote,
  getDelegationChain,
  getNoteIntentAttestationsByNote,
  delegateNote,
  revokeNote,
  reclaimFunds,
  DelegatableNotesAbi,
  type Note,
  type DelegationChainLink,
  type NoteIntentAttestation,
} from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { formatNoteAmount, isDelegate, truncateAddress, isEthNote } from '../utils'

function getContract() {
  const addr = import.meta.env.VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS
  if (!addr) return null
  return { address: addr as `0x${string}`, abi: DelegatableNotesAbi }
}

interface DelegationChainVisualizationProps {
  chain: DelegationChainLink[]
  note: Note
}

function DelegationChainVisualization({ chain, note }: DelegationChainVisualizationProps) {
  if (chain.length === 0) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Delegation Chain
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No delegation chain - note is undelegated
        </Typography>
      </Paper>
    )
  }

  const sortedChain = [...chain].sort((a, b) => a.position - b.position)
  const isRoot = (link: DelegationChainLink) => link.position === 0
  const isLeaf = (link: DelegationChainLink) => link.position === sortedChain[sortedChain.length - 1].position

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Delegation Chain
      </Typography>
      <Stack spacing={0} divider={<Divider sx={{ my: 1 }} />}>
        {sortedChain.map((link, index) => (
          <Box key={link.address} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 24 }}>
              {index > 0 && (
                <Box sx={{ width: 2, height: 12, bgcolor: 'divider' }} />
              )}
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: isRoot(link) ? 'primary.main' : isLeaf(link) ? 'success.main' : 'warning.main',
                }}
              />
              {index < sortedChain.length - 1 && (
                <Box sx={{ width: 2, height: 12, bgcolor: 'divider' }} />
              )}
            </Box>
            <Box sx={{ flex: 1, py: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">
                  {isRoot(link) ? 'Root' : isLeaf(link) ? 'Leaf' : `Delegate ${link.position}`}
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {truncateAddress(link.address)}
                </Typography>
                <Button
                  size="small"
                  onClick={() => navigator.clipboard.writeText(link.address)}
                  sx={{ minWidth: 'auto', p: 0.5 }}
                >
                  📋
                </Button>
                {isRoot(link) && (
                  <Chip label={`Deposited ${formatNoteAmount(note)}`} size="small" color="primary" variant="outlined" />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {new Date(Number(link.createdAt) * 1000).toLocaleString()}
              </Typography>
            </Box>
          </Box>
        ))}
      </Stack>
    </Paper>
  )
}

interface IntendedPurposeProps {
  attestations: NoteIntentAttestation[]
}

function IntendedPurpose({ attestations }: IntendedPurposeProps) {
  if (attestations.length === 0) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Intended Purpose
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No intended statement set for this note
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Intended Purpose
      </Typography>
      <Stack spacing={1}>
        {attestations.map((attestation) => (
          <Box key={`${attestation.attester}-${attestation.noteId}`}>
            <Typography variant="body2">
              Intended for{' '}
              <Typography
                component={RouterLink}
                to={`/statement/${attestation.intendedStatementId}`}
                sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                {attestation.intendedStatementId.slice(0, 20)}...
              </Typography>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Attested by {truncateAddress(attestation.attester)} on{' '}
              {new Date(Number(attestation.createdAt) * 1000).toLocaleDateString()}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Paper>
  )
}

interface DelegateDialogProps {
  open: boolean
  note: Note | null
  onClose: () => void
  onSubmit: (noteId: string, toAddress: string, amount: string) => void
}

function DelegateDialog({ open, note, onClose, onSubmit }: DelegateDialogProps) {
  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')

  useEffect(() => {
    if (note) setAmount(formatEther(BigInt(note.amount)))
  }, [note])

  const handleSubmit = () => {
    if (note && toAddress) {
      onSubmit(note.id, toAddress, amount)
      onClose()
      setToAddress('')
      setAmount('')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Delegate Note #{note?.id}</DialogTitle>
      <DialogContent>
        <TextField
          label="Delegate to address"
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
          fullWidth
          margin="normal"
          placeholder="0x..."
        />
        <TextField
          label="Amount (ETH)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          fullWidth
          margin="normal"
          helperText={note ? `Max: ${formatEther(BigInt(note.amount))} ETH` : ''}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!toAddress || !amount}>
          Delegate
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export function NoteDetailPage() {
  const { noteId } = useParams<{ noteId: string }>()
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const machinery = useMachinery()

  const [note, setNote] = useState<Note | null>(null)
  const [chain, setChain] = useState<DelegationChainLink[]>([])
  const [attestations, setAttestations] = useState<NoteIntentAttestation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [delegateDialogOpen, setDelegateDialogOpen] = useState(false)

  const getClients = () => {
    if (!walletClient || !publicClient || !address) return null
    return {
      walletClient: walletClient as any,
      publicClient: publicClient as any,
      account: address as `0x${string}`,
    }
  }

  const loadNoteData = async () => {
    if (!noteId) return
    try {
      setLoading(true)
      setError(null)
      const [noteData, chainData, attestationData] = await Promise.all([
        getNote(machinery, noteId),
        getDelegationChain(machinery, noteId),
        getNoteIntentAttestationsByNote(machinery, import.meta.env.VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS, noteId),
      ])
      setNote(noteData)
      setChain(chainData)
      setAttestations(attestationData)
    } catch (err) {
      console.error('Error loading note:', err)
      setError(err instanceof Error ? err.message : 'Failed to load note')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNoteData()
  }, [noteId])

  const handleDelegateSubmit = async (noteId: string, toAddress: string, amount: string) => {
    const clients = getClients()
    const contract = getContract()
    if (!clients || !contract) return
    try {
      setActionLoading(true)
      setActionError(null)
      const owners = chain
        .sort((a, b) => b.position - a.position)
        .map(link => link.address as `0x${string}`)
      await delegateNote(clients, contract, {
        noteId: BigInt(noteId),
        owners,
        delegateTo: toAddress as `0x${string}`,
        amount: parseEther(amount),
      })
      await loadNoteData()
    } catch (err) {
      console.error('Delegate failed:', err)
      setActionError(err instanceof Error ? err.message : 'Delegation failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRevoke = async () => {
    if (!note) return
    const clients = getClients()
    const contract = getContract()
    if (!clients || !contract) return
    try {
      setActionLoading(true)
      setActionError(null)
      const owners = chain
        .sort((a, b) => b.position - a.position)
        .map(link => link.address as `0x${string}`)
      await revokeNote(clients, contract, {
        noteId: BigInt(note.id),
        owners,
      })
      await loadNoteData()
    } catch (err) {
      console.error('Revoke failed:', err)
      setActionError(err instanceof Error ? err.message : 'Revocation failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReclaim = async () => {
    if (!note) return
    const clients = getClients()
    const contract = getContract()
    if (!clients || !contract) return
    try {
      setActionLoading(true)
      setActionError(null)
      await reclaimFunds(clients, contract, BigInt(note.id))
      await loadNoteData()
    } catch (err) {
      console.error('Reclaim failed:', err)
      setActionError(err instanceof Error ? err.message : 'Reclaim failed')
    } finally {
      setActionLoading(false)
    }
  }

  const isCurrentLeafOwner = note?.owner.toLowerCase() === address?.toLowerCase()
  const isRootOwner = note?.rootOwner.toLowerCase() === address?.toLowerCase()
  const isChainMember = chain.some(link => link.address.toLowerCase() === address?.toLowerCase())
  const isUndelegated = !isDelegate(note!)
  const canDelegate = isCurrentLeafOwner
  const canRevoke = isChainMember && !isCurrentLeafOwner
  const canReclaim = isRootOwner && isUndelegated

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !note) {
    return (
      <Box>
        <Alert severity="error">
          {error || 'Note not found'}
        </Alert>
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button component={RouterLink} to="/notes" size="small">
          ← Back to My Notes
        </Button>
      </Box>

      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {actionLoading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Transaction in progress...
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1">
              Note #{note.id}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Chip label={note.active ? 'Active' : 'Inactive'} color={note.active ? 'success' : 'default'} size="small" />
              {isDelegate(note) && <Chip label="Delegated" color="warning" size="small" />}
              {isEthNote(note) && <Chip label="ETH" size="small" variant="outlined" />}
              {!isEthNote(note) && <Chip label="ERC1155" size="small" variant="outlined" />}
            </Stack>
          </Box>
          <Typography variant="h4">{formatNoteAmount(note)}</Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={2}>
          <Box sx={{ display: 'flex', gap: 4 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Root Owner (Depositor)</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {truncateAddress(note.rootOwner)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Current Owner</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {truncateAddress(note.owner)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Created</Typography>
              <Typography variant="body2">
                {new Date(Number(note.createdAt) * 1000).toLocaleString()}
              </Typography>
            </Box>
          </Box>
          {!isEthNote(note) && (
            <Box>
              <Typography variant="caption" color="text.secondary">Token</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {note.token} (ID: {note.tokenId})
              </Typography>
            </Box>
          )}
        </Stack>
      </Paper>

      <Stack spacing={3} sx={{ mb: 3 }}>
        <DelegationChainVisualization chain={chain} note={note} />
        <IntendedPurpose attestations={attestations} />
      </Stack>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Actions
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ gap: 1 }}>
          {canDelegate && (
            <Button variant="contained" onClick={() => setDelegateDialogOpen(true)}>
              Delegate
            </Button>
          )}
          {canRevoke && (
            <Button variant="outlined" color="warning" onClick={handleRevoke}>
              Revoke
            </Button>
          )}
          {canReclaim && (
            <Button variant="outlined" color="error" onClick={handleReclaim}>
              Reclaim Funds
            </Button>
          )}
          {!canDelegate && !canRevoke && !canReclaim && (
            <Typography variant="body2" color="text.secondary">
              You don't have any actions available for this note.
            </Typography>
          )}
        </Stack>
      </Paper>

      <DelegateDialog
        open={delegateDialogOpen}
        note={note}
        onClose={() => setDelegateDialogOpen(false)}
        onSubmit={handleDelegateSubmit}
      />
    </Box>
  )
}
