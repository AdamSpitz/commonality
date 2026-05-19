import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { formatEther, parseEther } from 'viem'
import {
  getNotesByOwner,
  getNotesByRoot,
  getDelegationChain,
  delegateNote,
  revokeNote,
  reclaimFunds,
  DelegatableNotesAbi,
  type Note,
  type TestClients,
  type DelegatableNotesContract,
} from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { formatNoteAmount, isDelegate, truncateAddress, isEthNote } from '../utils'

function SummaryCards({ ownedNotes, depositedNotes }: { ownedNotes: Note[]; depositedNotes: Note[] }) {
  const totalFunds = ownedNotes.reduce((sum, n) => sum + BigInt(n.amount), 0n)
  const activeCount = ownedNotes.length
  const actingAsDelegate = ownedNotes.filter(n => isDelegate(n)).length
  const depositedAndDelegated = depositedNotes.filter(n => isDelegate(n)).length

  const cards = [
    { label: 'Total Funds', value: `${formatEther(totalFunds)} ETH` },
    { label: 'Active Funds', value: String(activeCount) },
    { label: 'Acting as Delegate', value: String(actingAsDelegate) },
    { label: 'Created & Delegated', value: String(depositedAndDelegated) },
  ]

  return (
    <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
      {cards.map((card) => (
        <Paper key={card.label} sx={{ p: 2, minWidth: 160, flex: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {card.label}
          </Typography>
          <Typography variant="h5">{card.value}</Typography>
        </Paper>
      ))}
    </Stack>
  )
}

function NoteCard({
  note,
  showDelegatedFrom,
  showCurrentOwner,
  showRevoke,
  showReclaim,
  showDelegate,
  onDelegate,
  onRevoke,
  onReclaim,
}: {
  note: Note
  showDelegatedFrom?: boolean
  showCurrentOwner?: boolean
  showRevoke?: boolean
  showReclaim?: boolean
  showDelegate?: boolean
  onDelegate?: (note: Note) => void
  onRevoke?: (note: Note) => void
  onReclaim?: (note: Note) => void
}) {
  return (
    <Card>
      <CardActionArea component={RouterLink} to={`/delegation/notes/${note.id}`}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="subtitle1">
                Fund #{note.id}
              </Typography>
              <Typography variant="h6">{formatNoteAmount(note)}</Typography>
              {!isEthNote(note) && (
                <Typography variant="body2" color="text.secondary">
                  Token: {truncateAddress(note.token)} (ID: {note.tokenId})
                </Typography>
              )}
              {showDelegatedFrom && isDelegate(note) && (
                <Chip
                  label={`Delegated from ${truncateAddress(note.rootOwner)}`}
                  size="small"
                  color="info"
                  sx={{ mt: 0.5 }}
                />
              )}
              {showCurrentOwner && isDelegate(note) && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Controlled by {truncateAddress(note.owner)}
                </Typography>
              )}
              {showCurrentOwner && !isDelegate(note) && (
                <Chip label="Undelegated" size="small" variant="outlined" sx={{ mt: 0.5 }} />
              )}
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
      {(showDelegate || showRevoke || showReclaim) && (
        <Box sx={{ px: 2, pb: 1.5, display: 'flex', gap: 1 }}>
          {showDelegate && (
            <Button
              size="small"
              variant="outlined"
              onClick={(e) => { e.preventDefault(); onDelegate?.(note) }}
            >
              Delegate
            </Button>
          )}
          {showRevoke && (
            <Button
              size="small"
              variant="outlined"
              color="warning"
              onClick={(e) => { e.preventDefault(); onRevoke?.(note) }}
            >
              Revoke
            </Button>
          )}
          {showReclaim && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={(e) => { e.preventDefault(); onReclaim?.(note) }}
            >
              Reclaim
            </Button>
          )}
        </Box>
      )}
    </Card>
  )
}

function DelegateDialog({
  open,
  note,
  onClose,
  onSubmit,
}: {
  open: boolean
  note: Note | null
  onClose: () => void
  onSubmit: (noteId: string, toAddress: string, amount: string) => void
}) {
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
      <DialogTitle>Delegate Fund #{note?.id}</DialogTitle>
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

function getContract(): DelegatableNotesContract | null {
  const addr = import.meta.env.VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS
  if (!addr) return null
  return { address: addr as `0x${string}`, abi: DelegatableNotesAbi }
}

export function MyNotesPage() {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const machinery = useMachinery()

  const [ownedNotes, setOwnedNotes] = useState<Note[]>([])
  const [depositedNotes, setDepositedNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [delegateDialogOpen, setDelegateDialogOpen] = useState(false)
  const [delegateTarget, setDelegateTarget] = useState<Note | null>(null)

  const getClients = (): TestClients | null => {
    if (!walletClient || !publicClient || !address) return null
    return {
      walletClient: walletClient as any,
      publicClient: publicClient as any,
      account: address as `0x${string}`,
    }
  }

  const loadNotes = useCallback(async () => {
    if (!address) return
    try {
      setLoading(true)
      setError(null)
      const [owned, deposited] = await Promise.all([
        getNotesByOwner(machinery, address),
        getNotesByRoot(machinery, address),
      ])
      setOwnedNotes(owned.filter(n => n.active))
      setDepositedNotes(deposited.filter(n => n.active))
    } catch (err) {
      console.error('Error loading notes:', err)
      setError(err instanceof Error ? err.message : 'Failed to load notes')
    } finally {
      setLoading(false)
    }
  }, [address, machinery])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const handleDelegate = (note: Note) => {
    setDelegateTarget(note)
    setDelegateDialogOpen(true)
  }

  const handleDelegateSubmit = async (noteId: string, toAddress: string, amount: string) => {
    const clients = getClients()
    const contract = getContract()
    if (!clients || !contract) return
    try {
      setActionLoading(true)
      setActionError(null)
      const chain = await getDelegationChain(machinery, noteId)
      // SDK expects owners as leaf-first, root-last
      const owners = chain
        .sort((a, b) => b.position - a.position)
        .map(link => link.address as `0x${string}`)
      await delegateNote(clients, contract, {
        noteId: BigInt(noteId),
        owners,
        delegateTo: toAddress as `0x${string}`,
        amount: parseEther(amount),
      })
      await loadNotes()
    } catch (err) {
      console.error('Delegate failed:', err)
      setActionError(err instanceof Error ? err.message : 'Delegation failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRevoke = async (note: Note) => {
    const clients = getClients()
    const contract = getContract()
    if (!clients || !contract) return
    try {
      setActionLoading(true)
      setActionError(null)
      const chain = await getDelegationChain(machinery, note.id)
      const owners = chain
        .sort((a, b) => b.position - a.position)
        .map(link => link.address as `0x${string}`)
      await revokeNote(clients, contract, {
        noteId: BigInt(note.id),
        owners,
      })
      await loadNotes()
    } catch (err) {
      console.error('Revoke failed:', err)
      setActionError(err instanceof Error ? err.message : 'Revocation failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReclaim = async (note: Note) => {
    const clients = getClients()
    const contract = getContract()
    if (!clients || !contract) return
    try {
      setActionLoading(true)
      setActionError(null)
      await reclaimFunds(clients, contract, BigInt(note.id))
      await loadNotes()
    } catch (err) {
      console.error('Reclaim failed:', err)
      setActionError(err instanceof Error ? err.message : 'Reclaim failed')
    } finally {
      setActionLoading(false)
    }
  }

  if (!address) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          My Delegated Funds
        </Typography>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Connect your wallet to view and manage your delegated funds.
          </Typography>
        </Paper>
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          My Delegated Funds
        </Typography>
        <Button variant="contained" component={RouterLink} to="/delegation/notes/new">
          Add Funds
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

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <>
          <SummaryCards ownedNotes={ownedNotes} depositedNotes={depositedNotes} />

          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 3 }}>
            Funds I Control
          </Typography>
          {ownedNotes.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center', mb: 3 }}>
              <Typography variant="body1" color="text.secondary">
                You don't control any funds yet. Add funds to create one, or ask someone to delegate to you.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2} sx={{ mb: 3 }}>
              {ownedNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  showDelegatedFrom
                  showDelegate
                  onDelegate={handleDelegate}
                />
              ))}
            </Stack>
          )}

          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 3 }}>
            Funds I Created
          </Typography>
          {depositedNotes.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                You haven't created any delegated funds yet.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {depositedNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  showCurrentOwner
                  showRevoke={isDelegate(note)}
                  showReclaim={!isDelegate(note)}
                  onRevoke={handleRevoke}
                  onReclaim={handleReclaim}
                />
              ))}
            </Stack>
          )}
        </>
      )}

      <DelegateDialog
        open={delegateDialogOpen}
        note={delegateTarget}
        onClose={() => { setDelegateDialogOpen(false); setDelegateTarget(null) }}
        onSubmit={handleDelegateSubmit}
      />
    </Box>
  )
}
