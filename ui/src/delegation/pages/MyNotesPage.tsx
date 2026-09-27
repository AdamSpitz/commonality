// REFACTOR-WANTED: this file is large (~570 lines). It mixes several
// concerns that could be extracted (note list rows, filters, and creation flow). Left intact for now — please split
// it up when next doing substantial work here.
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
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useAccount, usePublicClient } from 'wagmi'
import { decodeEventLog, formatEther, parseEther, type Hex } from 'viem'
import { DelegatableNotesAbi, RecurringPledgesAbi } from '@commonality/sdk/abis'
import { getStatement } from '@commonality/sdk/conceptspace'
import { getNotesByOwner, getNotesByRoot, getDelegationChain, getDonationActivityByRoot, delegateNote, partialTakeback, replaceDelegate, revokeNote, reclaimFunds, getActiveStandingPledgesByUser, cancelStandingPledge, type DonationActivity, type Note, type StandingPledge, type DelegatableNotesContract, type RecurringPledgesContract } from '@commonality/sdk/delegation'
import { fetchEventsComplete, type Currency, type IpfsCidV1 } from '@commonality/sdk/utils'
import { getDomainUrl, useMachinery } from '../../shared'
import { useWriteClients } from '../../shared'
import { formatCurrencyAmount, getCurrencyForNote } from '../../shared/funding'
import { formatNoteAmount, isDelegate, truncateAddress, isEthNote, noteDetailPath, noteScopedKey, parsePartialTakebackAmount } from '../utils'
import { DonorPendingSpends } from '../components/DonorPendingSpends'
import { spendClassLabel } from '../spendClass'
import { readLazyGivingProjectMetadata } from '../../lazy-giving/metadata'

function SummaryCards({ ownedNotes, depositedNotes, standingPledges, experience = 'delegation' }: { ownedNotes: Note[]; depositedNotes: Note[]; standingPledges: StandingPledge[]; experience?: 'delegation' | 'donate' }) {
  const totalFunds = ownedNotes.reduce((sum, n) => sum + BigInt(n.amount), 0n)
  const activeCount = ownedNotes.length
  const actingAsDelegate = ownedNotes.filter(n => isDelegate(n)).length
  const depositedAndDelegated = depositedNotes.filter(n => isDelegate(n)).length

  const delegationCards = [
    { label: 'Total Funds', value: `${formatEther(totalFunds)} ETH` },
    { label: 'Active Funds', value: String(activeCount) },
    { label: 'Acting as Delegate', value: String(actingAsDelegate) },
    { label: 'Active Monthly Pledges', value: String(standingPledges.length) },
    { label: 'Created & Delegated', value: String(depositedAndDelegated) },
  ]
  const activeDeposits = depositedNotes.filter(n => n.active)
  const donateCards = [
    { label: 'Monthly Pledges', value: String(standingPledges.length) },
    { label: 'Active Funds', value: String(activeDeposits.length) },
    { label: 'Delegated', value: String(activeDeposits.filter(n => isDelegate(n)).length) },
  ]
  const cards = experience === 'donate' ? donateCards : delegationCards

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
  showPartialTakeback,
  showReclaim,
  showDelegate,
  showReplace,
  showGiveBack,
  onDelegate,
  onReplace,
  onRevoke,
  onPartialTakeback,
  onReclaim,
  onGiveBack,
}: {
  note: Note
  showDelegatedFrom?: boolean
  showCurrentOwner?: boolean
  showRevoke?: boolean
  showPartialTakeback?: boolean
  showReclaim?: boolean
  showDelegate?: boolean
  showReplace?: boolean
  showGiveBack?: boolean
  onDelegate?: (note: Note) => void
  onReplace?: (note: Note) => void
  onRevoke?: (note: Note) => void
  onPartialTakeback?: (note: Note, amount: string) => void
  onReclaim?: (note: Note) => void
  onGiveBack?: (note: Note) => void
}) {
  const publicClient = usePublicClient()
  const [spendPending, setSpendPending] = useState(false)
  const [partialOpen, setPartialOpen] = useState(false)

  useEffect(() => {
    if (!showPartialTakeback || !publicClient) {
      setSpendPending(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const pending = await publicClient.readContract({
        address: note.contractAddress as `0x${string}`,
        abi: DelegatableNotesAbi,
        functionName: 'pendingSpends',
        args: [BigInt(note.id)],
      }) as readonly [unknown, unknown, bigint, bigint, bigint, bigint, bigint, boolean, boolean]
      if (!cancelled) setSpendPending(pending[8])
    })().catch(() => {
      if (!cancelled) setSpendPending(false)
    })
    return () => { cancelled = true }
  }, [publicClient, showPartialTakeback, note.contractAddress, note.id])

  return (
    <Card>
      <CardActionArea component={RouterLink} to={noteDetailPath(note)}>
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
      {(showDelegate || showReplace || showGiveBack || showRevoke || showPartialTakeback || showReclaim) && (
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
          {showReplace && (
            <Button
              size="small"
              variant="outlined"
              onClick={(e) => { e.preventDefault(); onReplace?.(note) }}
            >
              Replace delegate
            </Button>
          )}
          {showGiveBack && (
            <Button
              size="small"
              variant="outlined"
              color="warning"
              onClick={(e) => { e.preventDefault(); onGiveBack?.(note) }}
            >
              Hand back
            </Button>
          )}
          {showRevoke && (
            <Button
              size="small"
              variant="outlined"
              color="warning"
              onClick={(e) => { e.preventDefault(); onRevoke?.(note) }}
            >
              Takeback
            </Button>
          )}
          {showPartialTakeback && (
            <Button
              size="small"
              variant="outlined"
              disabled={spendPending}
              onClick={(e) => { e.preventDefault(); setPartialOpen(true) }}
            >
              Partial takeback
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
      <PartialTakebackDialog
        open={partialOpen}
        note={note}
        onClose={() => setPartialOpen(false)}
        onSubmit={(amount) => onPartialTakeback?.(note, amount)}
      />
    </Card>
  )
}

function PartialTakebackDialog({
  open,
  note,
  onClose,
  onSubmit,
}: {
  open: boolean
  note: Note | null
  onClose: () => void
  onSubmit: (amount: string) => void
}) {
  const [amount, setAmount] = useState('')
  const parsed = note ? parsePartialTakebackAmount(amount, note) : null
  const valid = parsed !== null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Partial takeback of fund #{note?.id}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mt: 1 }}>
          You are taking this amount back. The rest stays with the delegate under the same rules. This does not approve a payment.
        </Typography>
        <TextField
          label={`Amount to take back (${note ? getCurrencyForNote(note).symbol : ''})`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          fullWidth
          margin="normal"
          helperText={note ? `Greater than zero and less than ${formatNoteAmount(note)}` : ''}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => { if (valid && parsed !== null) { onSubmit(amount); onClose(); setAmount('') } }}
          variant="contained"
          disabled={!valid}
        >
          Take back
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function DelegateDialog({
  open,
  note,
  mode,
  onClose,
  onSubmit,
}: {
  open: boolean
  note: Note | null
  mode: 'delegate' | 'replace'
  onClose: () => void
  onSubmit: (note: Note, toAddress: string, amount: string) => void
}) {
  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')

  useEffect(() => {
    if (note) setAmount(formatEther(BigInt(note.amount)))
  }, [note])

  const handleSubmit = () => {
    if (note && toAddress) {
      onSubmit(note, toAddress, amount)
      onClose()
      setToAddress('')
      setAmount('')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'replace' ? `Replace delegate on fund #${note?.id}` : `Delegate fund #${note?.id}`}</DialogTitle>
      <DialogContent>
        <TextField
          label={mode === 'replace' ? 'New delegate address' : 'Delegate to address'}
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
          {mode === 'replace' ? 'Replace' : 'Delegate'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function getContract(address?: string): DelegatableNotesContract | null {
  const addr = address ?? import.meta.env.VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS
  if (!addr) return null
  return { address: addr as `0x${string}`, abi: DelegatableNotesAbi }
}

function getRecurringPledgesContract(address?: string): RecurringPledgesContract | null {
  const addr = address ?? import.meta.env.VITE_RECURRING_PLEDGES_CONTRACT_ADDRESS
  if (!addr) return null
  return { address: addr as `0x${string}`, abi: RecurringPledgesAbi }
}

function getCurrencyForStandingPledge(pledge: StandingPledge): Currency {
  const paymentTokenAddress = import.meta.env.VITE_PAYMENT_TOKEN_ADDRESS
  if (paymentTokenAddress && pledge.token.toLowerCase() === paymentTokenAddress.toLowerCase()) {
    return {
      kind: 'erc20',
      symbol: import.meta.env.VITE_PAYMENT_TOKEN_SYMBOL ?? 'tokens',
      decimals: Number(import.meta.env.VITE_PAYMENT_TOKEN_DECIMALS ?? '18'),
      tokenAddress: paymentTokenAddress,
      tokenType: 0,
    }
  }

  return getCurrencyForNote({ token: pledge.token, tokenType: 0, tokenId: '0' })
}

function formatStandingPledgeAmount(pledge: StandingPledge): string {
  return `${formatCurrencyAmount(pledge.amountPerPeriod, getCurrencyForStandingPledge(pledge))}/month`
}

function formatPledgeDate(timestamp: string): string {
  return new Date(Number(timestamp) * 1000).toLocaleDateString()
}

function StandingPledgeCard({
  pledge,
  causeTitle,
  onCancel,
  actionLoading,
}: {
  pledge: StandingPledge
  causeTitle?: string
  onCancel: (pledge: StandingPledge) => void
  actionLoading: boolean
}) {
  const [confirmingCancellation, setConfirmingCancellation] = useState(false)

  return (
    <>
      <Card>
        <CardContent>
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="subtitle1">Monthly pledge #{pledge.id}</Typography>
                <Typography variant="h6">{formatStandingPledgeAmount(pledge)}</Typography>
              </Box>
              <Chip label="Auto-pull" color="success" size="small" />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Delegated to {truncateAddress(pledge.delegateTo)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cause:{' '}
              <Link href={getDomainUrl('tally', `/statement/${pledge.causeRef}`)}>
                {causeTitle ?? 'Untitled cause'}
              </Link>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Last executed: {pledge.lastExecuted === '0' ? 'not yet' : formatPledgeDate(pledge.lastExecuted)}
            </Typography>
            <Box>
              <Button
                size="small"
                variant="outlined"
                color="warning"
                disabled={actionLoading}
                onClick={() => setConfirmingCancellation(true)}
              >
                Cancel monthly pledge
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
      <Dialog open={confirmingCancellation} onClose={() => setConfirmingCancellation(false)}>
        <DialogTitle>Cancel this monthly pledge?</DialogTitle>
        <DialogContent>
          <Typography>
            Automatic monthly giving will stop. Funds already created by earlier executions are unaffected. This pledge cannot be resumed; you would need to create a new one.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmingCancellation(false)}>Keep pledge</Button>
          <Button
            color="warning"
            variant="contained"
            disabled={actionLoading}
            onClick={() => {
              setConfirmingCancellation(false)
              onCancel(pledge)
            }}
          >
            Confirm cancellation
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

function DonationActivityFeed({ activities, projectTitles, causeTitles, classByNoteId }: {
  activities: DonationActivity[]
  projectTitles: Record<string, string>
  causeTitles: Record<string, string>
  classByNoteId: Record<string, number>
}) {
  const groups = new Map<string, DonationActivity[]>()
  for (const activity of activities) {
    const key = activity.projectAddress?.toLowerCase() ?? activity.receiptContract.toLowerCase()
    groups.set(key, [...(groups.get(key) ?? []), activity])
  }

  return (
    <Stack spacing={2}>
      {[...groups.entries()].map(([key, rows]) => {
        const projectAddress = rows[0].projectAddress
        const title = projectTitles[key] ?? (projectAddress ? `Project ${truncateAddress(projectAddress)}` : `Receipt contract ${truncateAddress(rows[0].receiptContract)}`)
        return (
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }} key={key}>
            <Typography variant="h6" component="h3" sx={{ fontWeight: 750 }}>
              {projectAddress ? <Link component={RouterLink} to={`/projects/${projectAddress}`}>{title}</Link> : title}
            </Typography>
            <Stack spacing={2} divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />} sx={{ mt: 1.5 }}>
              {rows.map((activity) => (
                <Box key={activity.id}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>{formatCurrencyAmount(activity.amount, activity.currency)}</Typography>
                      {(() => {
                        const value = activity.inputNoteIds.map((id) => classByNoteId[`${activity.noteContract?.toLowerCase()}:${activity.transactionHash.toLowerCase()}:${id}`]).find((item) => item !== undefined)
                        if (value === undefined) return null
                        const label = spendClassLabel(value)
                        return <Chip label={label} size="small" color={label === 'Suspicious' ? 'warning' : 'default'} />
                      })()}
                      <Typography variant="body2" color="text.secondary">
                        Directed by {truncateAddress(activity.directedBy)} · {formatPledgeDate(activity.createdAt)}
                      </Typography>
                    </Box>
                    <Chip label={activity.status} size="small" color={activity.status === 'refunded' ? 'warning' : activity.status === 'reimbursed' ? 'success' : 'default'} />
                  </Stack>
                  {activity.intendedStatementIds.length > 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                      Scope: {activity.intendedStatementIds.map(id => causeTitles[id] ?? id).join(', ')}
                    </Typography>
                  )}
                  {BigInt(activity.reimbursedAmount) > 0n && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Reimbursed: {formatCurrencyAmount(activity.reimbursedAmount, activity.currency)}
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
          </Paper>
        )
      })}
    </Stack>
  )
}

export function MyNotesPage({ experience = 'delegation' }: { experience?: 'delegation' | 'donate' } = {}) {
  const { address } = useAccount()
  const writeClients = useWriteClients(address)
  const machinery = useMachinery()

  const [ownedNotes, setOwnedNotes] = useState<Note[]>([])
  const [depositedNotes, setDepositedNotes] = useState<Note[]>([])
  const [standingPledges, setStandingPledges] = useState<StandingPledge[]>([])
  const [donationActivity, setDonationActivity] = useState<DonationActivity[]>([])
  const [classByNoteId, setClassByNoteId] = useState<Record<string, number>>({})
  const [causeTitles, setCauseTitles] = useState<Record<string, string>>({})
  const [projectTitles, setProjectTitles] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activityError, setActivityError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [delegateDialogOpen, setDelegateDialogOpen] = useState(false)
  const [delegateMode, setDelegateMode] = useState<'delegate' | 'replace'>('delegate')
  const [delegateTarget, setDelegateTarget] = useState<Note | null>(null)
  const isDonate = experience === 'donate'

  const getClients = () => {
    if (!writeClients || !address) return null
    return writeClients
  }

  const loadNotes = useCallback(async () => {
    if (!address) return
    try {
      setLoading(true)
      setError(null)
      setActivityError(null)
      const recurringPledgesContract = getRecurringPledgesContract()
      const [owned, deposited, activePledges, activity] = await Promise.all([
        getNotesByOwner(machinery, address),
        getNotesByRoot(machinery, address),
        recurringPledgesContract ? getActiveStandingPledgesByUser(machinery, address) : Promise.resolve([]),
        isDonate
          ? getDonationActivityByRoot(machinery, address).catch((activityLoadError) => {
              console.error('Error loading donation activity:', activityLoadError)
              setActivityError('Donation history is temporarily unavailable.')
              return []
            })
          : Promise.resolve([]),
      ])
      setOwnedNotes(owned.filter(n => n.active))
      setDepositedNotes(deposited.filter(n => n.active))
      setStandingPledges(activePledges)
      setDonationActivity(activity)
      if (isDonate && machinery.eventCacheUrl) {
        const events = await fetchEventsComplete(machinery, {
          eventName: 'SpendClassResolved',
        }).catch(() => [])
        const labels: Record<string, number> = {}
        for (const event of events) {
          if (!event.topic0 || !event.topic1) continue
          const decoded = decodeEventLog({
            abi: DelegatableNotesAbi,
            eventName: 'SpendClassResolved',
            topics: [event.topic0 as Hex, event.topic1 as Hex],
            data: event.data as Hex,
          })
          labels[`${event.contractAddress.toLowerCase()}:${event.transactionHash.toLowerCase()}:${decoded.args.noteId}`] = Number(decoded.args.class)
        }
        setClassByNoteId(labels)
      } else {
        setClassByNoteId({})
      }
      const projectEntries = await Promise.all(activity.map(async (row) => {
        if (!row.projectMetadataCid) return [row.projectAddress?.toLowerCase() ?? row.receiptContract.toLowerCase(), undefined] as const
        const metadata = await readLazyGivingProjectMetadata(machinery, row.projectMetadataCid as IpfsCidV1).catch(() => null)
        return [row.projectAddress?.toLowerCase() ?? row.receiptContract.toLowerCase(), metadata?.name?.trim()] as const
      }))
      setProjectTitles(Object.fromEntries(projectEntries.filter((entry): entry is readonly [string, string] => Boolean(entry[1]))))
      const causeEntries = await Promise.all(
        [...new Set([...activePledges.map((pledge) => pledge.causeRef), ...activity.flatMap((row) => row.intendedStatementIds)])].map(async (causeRef) => {
          const statement = await getStatement(machinery, causeRef as IpfsCidV1).catch(() => null)
          return [causeRef, statement?.title?.trim() || 'Untitled cause'] as const
        }),
      )
      setCauseTitles(Object.fromEntries(causeEntries))
    } catch (err) {
      console.error('Error loading notes:', err)
      setError(err instanceof Error ? err.message : 'Failed to load notes')
    } finally {
      setLoading(false)
    }
  }, [address, machinery, isDonate])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const handleDelegate = (note: Note) => {
    setDelegateMode('delegate')
    setDelegateTarget(note)
    setDelegateDialogOpen(true)
  }

  const handleReplace = (note: Note) => {
    setDelegateMode('replace')
    setDelegateTarget(note)
    setDelegateDialogOpen(true)
  }

  const handleDelegateSubmit = async (note: Note, toAddress: string, amount: string) => {
    const clients = getClients()
    const contract = getContract(note.contractAddress)
    if (!clients || !contract) return
    try {
      setActionLoading(true)
      setActionError(null)
      const chain = await getDelegationChain(machinery, noteScopedKey(note))
      // SDK expects owners as leaf-first, root-last
      const owners = chain
        .sort((a, b) => b.position - a.position)
        .map(link => link.address as `0x${string}`)
      const amountWei = parseEther(amount)
      if (delegateMode === 'replace') {
        await replaceDelegate(clients, contract, {
          noteId: BigInt(note.id),
          owners,
          newDelegate: toAddress as `0x${string}`,
          amount: amountWei,
        })
      } else {
        await delegateNote(clients, contract, {
          noteId: BigInt(note.id),
          owners,
          delegateTo: toAddress as `0x${string}`,
          amount: amountWei,
        })
      }
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
    const contract = getContract(note.contractAddress)
    if (!clients || !contract) return
    try {
      setActionLoading(true)
      setActionError(null)
      const chain = await getDelegationChain(machinery, noteScopedKey(note))
      const owners = chain
        .sort((a, b) => b.position - a.position)
        .map(link => link.address as `0x${string}`)
      await revokeNote(clients, contract, {
        noteId: BigInt(note.id),
        owners,
      })
      await loadNotes()
    } catch (err) {
      console.error('Takeback failed:', err)
      setActionError(err instanceof Error ? err.message : 'Takeback failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePartialTakeback = async (note: Note, amount: string) => {
    const parsed = parsePartialTakebackAmount(amount, note)
    if (parsed === null) return
    const clients = getClients()
    const contract = getContract(note.contractAddress)
    if (!clients || !contract) return
    try {
      setActionLoading(true)
      setActionError(null)
      const chain = await getDelegationChain(machinery, noteScopedKey(note))
      const owners = chain
        .sort((a, b) => b.position - a.position)
        .map(link => link.address as `0x${string}`)
      await partialTakeback(clients, contract, {
        noteId: BigInt(note.id),
        owners,
        amount: parsed,
      })
      await loadNotes()
    } catch (err) {
      console.error('Partial takeback failed:', err)
      setActionError(err instanceof Error ? err.message : 'Partial takeback failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReclaim = async (note: Note) => {
    const clients = getClients()
    const contract = getContract(note.contractAddress)
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

  const handleCancelStandingPledge = async (pledge: StandingPledge) => {
    const clients = getClients()
    const contract = getRecurringPledgesContract(pledge.contractAddress)
    if (!clients || !contract) return
    try {
      setActionLoading(true)
      setActionError(null)
      await cancelStandingPledge(clients, contract, BigInt(pledge.id))
      await loadNotes()
    } catch (err) {
      console.error('Cancel standing pledge failed:', err)
      setActionError(err instanceof Error ? err.message : 'Cancel standing pledge failed')
    } finally {
      setActionLoading(false)
    }
  }

  if (!address) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          {isDonate ? 'Donate' : 'My Delegated Funds'}
        </Typography>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            {isDonate
              ? 'Connect your wallet to set up monthly giving and manage money you have delegated.'
              : 'Connect your wallet to view and manage your delegated funds.'}
          </Typography>
        </Paper>
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h4" component="h1">
          {isDonate ? 'Donate' : 'My Delegated Funds'}
        </Typography>
        <Button variant="contained" component={RouterLink} to="/delegation/notes/new">
          {isDonate ? 'Set up a donation' : 'Add Funds'}
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {isDonate
          ? 'Set aside money for a cause and hand the project-by-project decisions to someone you trust.'
          : <><Link component={RouterLink} to="/docs/key-ideas/delegation">How delegation works</Link>{' — hand off your donation decisions to someone you trust.'}</>}
      </Typography>

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
          <SummaryCards ownedNotes={ownedNotes} depositedNotes={depositedNotes} standingPledges={standingPledges} experience={experience} />

          {!isDonate && <>
            <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 3 }}>Funds I Control</Typography>
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
                    key={noteScopedKey(note)}
                    note={note}
                    showDelegatedFrom
                    showDelegate={!isDelegate(note)}
                    showGiveBack={isDelegate(note)}
                    onDelegate={handleDelegate}
                    onGiveBack={handleRevoke}
                  />
                ))}
              </Stack>
            )}
          </>}

          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 3 }}>
            {isDonate ? 'Monthly giving' : 'Monthly Pledges'}
          </Typography>
          {standingPledges.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center', mb: 3 }}>
              <Typography variant="body1" color="text.secondary">
                You don't have any active monthly pledges yet. Set an amount, a cause, and a delegate to make your giving automatic.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2} sx={{ mb: 3 }}>
              {standingPledges.map((pledge) => (
                <StandingPledgeCard
                  key={`${pledge.contractAddress.toLowerCase()}:${pledge.id}`}
                  pledge={pledge}
                  causeTitle={causeTitles[pledge.causeRef]}
                  actionLoading={actionLoading}
                  onCancel={handleCancelStandingPledge}
                />
              ))}
            </Stack>
          )}

          <DonorPendingSpends notes={depositedNotes} />

          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 3 }}>
            {isDonate ? 'Money in the system' : 'Funds I Created'}
          </Typography>
          {depositedNotes.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                {isDonate
                  ? "You don't have any active funds in the system yet."
                  : "You haven't created any delegated funds yet."}
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {depositedNotes.map((note) => (
                <NoteCard
                  key={noteScopedKey(note)}
                  note={note}
                  showCurrentOwner
                  showRevoke={isDelegate(note)}
                  showPartialTakeback={isDelegate(note)}
                  showReplace={isDelegate(note)}
                  showReclaim={!isDelegate(note)}
                  showDelegate={!isDelegate(note)}
                  onDelegate={handleDelegate}
                  onReplace={handleReplace}
                  onRevoke={handleRevoke}
                  onPartialTakeback={handlePartialTakeback}
                  onReclaim={handleReclaim}
                />
              ))}
            </Stack>
          )}

          {isDonate && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h5" component="h2" gutterBottom>What my money did</Typography>
              {activityError ? (
                <Alert severity="warning">{activityError}</Alert>
              ) : donationActivity.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    No project allocations from your funds yet. When you or a delegate funds a project, its receipt will appear here.
                  </Typography>
                </Paper>
              ) : (
                <DonationActivityFeed activities={donationActivity} projectTitles={projectTitles} causeTitles={causeTitles} classByNoteId={classByNoteId} />
              )}
            </Box>
          )}

          {isDonate && (
            <Paper variant="outlined" sx={{ mt: 4, p: 2.5, borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Want to direct the money yourself?</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1 }}>
                Fund is the active workspace for reviewing projects and deciding where money goes.
              </Typography>
              <Button component={RouterLink} to="/dashboard" sx={{ px: 0 }}>Go to Fund</Button>
            </Paper>
          )}
        </>
      )}

      <DelegateDialog
        open={delegateDialogOpen}
        note={delegateTarget}
        mode={delegateMode}
        onClose={() => { setDelegateDialogOpen(false); setDelegateTarget(null) }}
        onSubmit={handleDelegateSubmit}
      />
    </Box>
  )
}

export function DonatePage() {
  return <MyNotesPage experience="donate" />
}
