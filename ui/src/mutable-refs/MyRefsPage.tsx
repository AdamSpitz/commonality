// REFACTOR-WANTED: this file is large (~950 lines). It mixes several
// concerns that could be extracted (list/table rows, create-ref form, and per-ref edit dialogs). Left intact for now — please split
// it up when next doing substantial work here. See workflow/reviews/ui-deep-dive-2026-06-25.md (issue #3).
import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
  Divider,
  Stack,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useAccount } from 'wagmi'
import { MutableRefUpdaterAbi } from '@commonality/sdk/abis'
import { getUserRefs, getUserRef, getUserRefHistory, updateRef, type MutableRef, type RefUpdate, type MutableRefUpdaterContract } from '@commonality/sdk/mutable-refs'
import { createDefaultDocumentReader, type DocumentReadResult } from '@commonality/sdk/displayable-documents'
import { fetchFromIPFS, type IpfsCidV1 } from '@commonality/sdk/utils'
import { useMachinery } from '../shared'
import { useWriteClients } from '../shared'

// ============================================================================
// Helpers
// ============================================================================

function getContract(): MutableRefUpdaterContract | null {
  const addr = import.meta.env.VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS
  if (!addr) return null
  return { address: addr as `0x${string}`, abi: MutableRefUpdaterAbi }
}

function truncateValue(value: string, maxLen = 50): string {
  if (value.length <= maxLen) return value
  return value.slice(0, maxLen) + '…'
}

function formatRelativeTime(timestamp: string): string {
  const ts = Number(timestamp)
  const now = Math.floor(Date.now() / 1000)
  const diff = now - ts
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} days ago`
  return new Date(ts * 1000).toLocaleDateString()
}

function formatAbsoluteTime(timestamp: string): string {
  return new Date(Number(timestamp) * 1000).toLocaleString()
}

function isCid(value: string): boolean {
  return value.startsWith('b') || value.startsWith('Qm')
}

function shouldTryCidFirstReader(cid: string): cid is IpfsCidV1 {
  return cid.startsWith('b')
}

function shouldSuppressLegacyFallback(result: DocumentReadResult): boolean {
  return result.status === 'retracted' || result.status === 'invalid'
}

function getBlockExplorerUrl(txHash: string): string {
  const base = import.meta.env.VITE_BLOCK_EXPLORER_URL || 'https://etherscan.io'
  return `${base}/tx/${txHash}`
}

// ============================================================================
// IPFSInspector
// ============================================================================

function IPFSInspector({ cid }: { cid: string }) {
  const machinery = useMachinery()
  const [content, setContent] = useState<object | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const handleExpand = async () => {
    if (!expanded && content === null && !loading) {
      setLoading(true)
      setError(null)
      try {
        if (shouldTryCidFirstReader(cid)) {
          const documentResult = await createDefaultDocumentReader(machinery).read(cid)
          if (documentResult.status === 'active') {
            setContent(documentResult.document)
            setExpanded(true)
            return
          }
          if (shouldSuppressLegacyFallback(documentResult)) {
            setError(documentResult.status === 'retracted' ? 'Content is retracted' : 'Content is not a valid displayable document')
            setExpanded(true)
            return
          }
        }

        const result = await fetchFromIPFS(machinery.ipfsConfig, cid)
        if (result === null) {
          setError('Content not found or failed to fetch')
        } else {
          setContent(result)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch IPFS content')
      } finally {
        setLoading(false)
      }
    }
    setExpanded(prev => !prev)
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Button
        size="small"
        onClick={handleExpand}
        variant="outlined"
        endIcon={
          <ExpandMoreIcon
            sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
          />
        }
      >
        Inspect IPFS Content
      </Button>
      <Collapse in={expanded}>
        <Paper variant="outlined" sx={{ mt: 1, p: 2 }}>
          {loading && <CircularProgress size={20} />}
          {error && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              {error}
            </Alert>
          )}
          {!loading && content !== null && (
            <Box
              component="pre"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                m: 0,
                maxHeight: 400,
                overflow: 'auto',
              }}
            >
              {JSON.stringify(content, null, 2)}
            </Box>
          )}
        </Paper>
      </Collapse>
    </Box>
  )
}

// ============================================================================
// DeleteConfirmDialog
// ============================================================================

function DeleteConfirmDialog({
  open,
  refName,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean
  refName: string
  onClose: () => void
  onConfirm: () => void
  loading?: boolean
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete Ref</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete <strong>{refName}</strong>? This sets its value to an
          empty string (the contract doesn&apos;t support true deletion).
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={onConfirm} variant="contained" color="error" disabled={loading}>
          {loading ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ============================================================================
// HistorySection
// ============================================================================

function HistorySection({ selectedRef }: { selectedRef: MutableRef }) {
  const machinery = useMachinery()
  const [expanded, setExpanded] = useState(false)
  const [history, setHistory] = useState<RefUpdate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [limit, setLimit] = useState(20)

  const loadHistory = async (lim: number) => {
    setLoading(true)
    setError(null)
    try {
      const updates = await getUserRefHistory(machinery, selectedRef.owner, selectedRef.name, lim)
      setHistory(updates)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = () => {
    const next = !expanded
    setExpanded(next)
    if (next && history.length === 0) {
      loadHistory(limit)
    }
  }

  const handleLoadMore = () => {
    const newLimit = limit + 20
    setLimit(newLimit)
    loadHistory(newLimit)
  }

  return (
    <Box>
      <Button
        size="small"
        variant="text"
        onClick={handleToggle}
        endIcon={
          <ExpandMoreIcon
            sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
          />
        }
      >
        History
      </Button>
      <Collapse in={expanded}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
        {!loading && !error && history.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            No history found.
          </Typography>
        )}
        {!loading && history.length > 0 && (
          <>
            <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Value</TableCell>
                    <TableCell>Block</TableCell>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Tx</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((update) => (
                    <TableRow key={update.id}>
                      <TableCell>
                        <Tooltip title={update.value}>
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                          >
                            {truncateValue(update.value, 30)}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{update.blockNumber}</TableCell>
                      <TableCell>
                        <Tooltip title={formatAbsoluteTime(update.timestamp)}>
                          <span>{formatRelativeTime(update.timestamp)}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <a
                          href={getBlockExplorerUrl(update.transactionHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {update.transactionHash.slice(0, 10)}…
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {history.length === limit && (
              <Button size="small" onClick={handleLoadMore} disabled={loading} sx={{ mt: 1 }}>
                Load more
              </Button>
            )}
          </>
        )}
      </Collapse>
    </Box>
  )
}

// ============================================================================
// RefDetailDialog
// ============================================================================

type DialogView = 'view' | 'edit' | 'history'

interface RefDetailDialogProps {
  open: boolean
  selectedRef: MutableRef | null
  initialView?: DialogView
  onClose: () => void
  onSave: (name: string, value: string) => Promise<void>
  onDelete: (name: string) => Promise<void>
}

function RefDetailDialog({
  open,
  selectedRef,
  initialView = 'view',
  onClose,
  onSave,
  onDelete,
}: RefDetailDialogProps) {
  const [editMode, setEditMode] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [currentValue, setCurrentValue] = useState('')

  useEffect(() => {
    if (selectedRef && open) {
      setCurrentValue(selectedRef.value)
      setEditValue(selectedRef.value)
      setEditMode(initialView === 'edit')
      setSaveError(null)
      setCopied(false)
      setDeleteConfirmOpen(false)
    }
  }, [selectedRef, open, initialView])

  const handleSave = async () => {
    if (!selectedRef) return
    try {
      setSaving(true)
      setSaveError(null)
      await onSave(selectedRef.name, editValue)
      setCurrentValue(editValue)
      setEditMode(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedRef) return
    try {
      setDeleting(true)
      setSaveError(null)
      await onDelete(selectedRef.name)
      setDeleteConfirmOpen(false)
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Delete failed')
      setDeleting(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(currentValue)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (!selectedRef) return null

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Ref: {selectedRef.name}</DialogTitle>
        <DialogContent>
          {saveError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>
              {saveError}
            </Alert>
          )}

          {/* Current Value */}
          <Typography variant="subtitle2" gutterBottom>
            Current Value
          </Typography>
          {editMode ? (
            <>
              <TextField
                multiline
                rows={4}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                fullWidth
                inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.875rem' } }}
              />
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={saving}
                  size="small"
                >
                  {saving ? 'Saving…' : 'Save'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setEditMode(false)}
                  disabled={saving}
                  size="small"
                >
                  Cancel
                </Button>
              </Stack>
            </>
          ) : (
            <>
              <Box
                component="textarea"
                value={currentValue}
                readOnly
                rows={4}
                sx={{
                  width: '100%',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  p: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button size="small" variant="outlined" onClick={handleCopy}>
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button size="small" variant="outlined" onClick={() => setEditMode(true)}>
                  Edit
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  Delete
                </Button>
              </Stack>
            </>
          )}

          {/* IPFS Inspector */}
          {isCid(currentValue) && <IPFSInspector cid={currentValue} />}

          <Divider sx={{ my: 2 }} />

          {/* History */}
          <HistorySection selectedRef={selectedRef} />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        refName={selectedRef.name}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  )
}

// ============================================================================
// RefsTable
// ============================================================================

function RefsTable({
  refs,
  onOpenDialog,
  onOpenEdit,
  onDelete,
}: {
  refs: MutableRef[]
  onOpenDialog: (ref: MutableRef, view?: DialogView) => void
  onOpenEdit: (ref: MutableRef) => void
  onDelete: (ref: MutableRef) => void
}) {
  return (
    <TableContainer component={Paper} sx={{ mb: 3 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Value</TableCell>
            <TableCell>Updated</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {refs.map((ref) => (
            <TableRow key={ref.name} hover>
              <TableCell>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => onOpenDialog(ref)}
                  sx={{ textTransform: 'none', fontFamily: 'monospace', p: 0, minWidth: 0 }}
                >
                  {ref.name}
                </Button>
              </TableCell>
              <TableCell>
                <Tooltip title={ref.value} enterDelay={300}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {truncateValue(ref.value)}
                  </Typography>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Tooltip title={formatAbsoluteTime(ref.updatedAt)}>
                  <span>{formatRelativeTime(ref.updatedAt)}</span>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={0.5}>
                  <Button size="small" onClick={() => onOpenEdit(ref)}>
                    Edit
                  </Button>
                  <Button size="small" color="error" onClick={() => onDelete(ref)}>
                    Delete
                  </Button>
                  <Button size="small" onClick={() => onOpenDialog(ref, 'history')}>
                    History
                  </Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

// ============================================================================
// RefLookupSection
// ============================================================================

function RefLookupSection() {
  const machinery = useMachinery()
  const [expanded, setExpanded] = useState(false)
  const [lookupAddress, setLookupAddress] = useState('')
  const [lookupName, setLookupName] = useState('')
  const [lookupRefs, setLookupRefs] = useState<MutableRef[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const handleLookup = async () => {
    if (!lookupAddress) return
    setLoading(true)
    setError(null)
    setSearched(false)
    try {
      if (lookupName) {
        const single = await getUserRef(machinery, lookupAddress, lookupName)
        setLookupRefs(single ? [single] : [])
      } else {
        const all = await getUserRefs(machinery, lookupAddress)
        setLookupRefs([...all].sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt)))
      }
      setSearched(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Button
        variant="text"
        onClick={() => setExpanded(!expanded)}
        endIcon={
          <ExpandMoreIcon
            sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
          />
        }
        sx={{ mb: 1 }}
      >
        Ref Lookup (Other Users)
      </Button>
      <Collapse in={expanded}>
        <Divider sx={{ mb: 2 }} />
        <Stack spacing={2}>
          <TextField
            label="Address"
            value={lookupAddress}
            onChange={(e) => setLookupAddress(e.target.value)}
            placeholder="0x…"
            fullWidth
            size="small"
          />
          <TextField
            label="Name (optional)"
            value={lookupName}
            onChange={(e) => setLookupName(e.target.value)}
            placeholder="If blank, fetch all refs for this address"
            fullWidth
            size="small"
          />
          <Button
            variant="outlined"
            onClick={handleLookup}
            disabled={loading || !lookupAddress}
            sx={{ alignSelf: 'flex-start' }}
          >
            {loading ? 'Looking up…' : 'Look Up'}
          </Button>
        </Stack>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        {!loading && searched && lookupRefs.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            No refs found for this address.
          </Typography>
        )}
        {!loading && lookupRefs.length > 0 && (
          <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lookupRefs.map((ref) => (
                  <TableRow key={`${ref.owner}-${ref.name}`} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {ref.name}
                    </TableCell>
                    <TableCell>
                      <Tooltip title={ref.value} enterDelay={300}>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                        >
                          {truncateValue(ref.value)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={formatAbsoluteTime(ref.updatedAt)}>
                        <span>{formatRelativeTime(ref.updatedAt)}</span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Collapse>
    </Paper>
  )
}

// ============================================================================
// MyRefsPage
// ============================================================================

export function MyRefsPage() {
  const { address } = useAccount()
  const writeClients = useWriteClients(address)
  const machinery = useMachinery()

  const [refs, setRefs] = useState<MutableRef[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create/update form
  const [formName, setFormName] = useState('')
  const [formValue, setFormValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Dialog
  const [dialogRef, setDialogRef] = useState<MutableRef | null>(null)
  const [dialogView, setDialogView] = useState<DialogView>('view')

  // Direct-from-table delete
  const [deleteTarget, setDeleteTarget] = useState<MutableRef | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const getClients = () => {
    if (!writeClients || !address) return null
    return writeClients
  }

  const loadRefs = async () => {
    if (!address) return
    try {
      setLoading(true)
      setError(null)
      const result = await getUserRefs(machinery, address)
      setRefs([...result].sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load refs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (address) loadRefs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

  const existingRefForName = refs.find((r) => r.name === formName)

  const handleSubmit = async () => {
    const clients = getClients()
    const contract = getContract()
    if (!clients || !contract) return
    try {
      setSubmitting(true)
      setSubmitError(null)
      setSubmitSuccess(false)
      await updateRef(clients, contract, formName, formValue)
      setSubmitSuccess(true)
      setFormName('')
      setFormValue('')
      void loadRefs()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to update ref')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveFromDialog = async (name: string, value: string) => {
    const clients = getClients()
    const contract = getContract()
    if (!clients || !contract) throw new Error('Not connected')
    await updateRef(clients, contract, name, value)
    setRefs((prev) =>
      prev.map((r) =>
        r.name === name
          ? { ...r, value, updatedAt: String(Math.floor(Date.now() / 1000)) }
          : r
      )
    )
    setTimeout(loadRefs, 1500)
  }

  const handleDeleteFromDialog = async (name: string) => {
    const clients = getClients()
    const contract = getContract()
    if (!clients || !contract) throw new Error('Not connected')
    await updateRef(clients, contract, name, '')
    setRefs((prev) => prev.filter((r) => r.name !== name))
    setTimeout(loadRefs, 1500)
  }

  const handleDirectDelete = async () => {
    if (!deleteTarget) return
    const clients = getClients()
    const contract = getContract()
    if (!clients || !contract) return
    try {
      setDeleting(true)
      setDeleteError(null)
      await updateRef(clients, contract, deleteTarget.name, '')
      setRefs((prev) => prev.filter((r) => r.name !== deleteTarget.name))
      setDeleteTarget(null)
      setTimeout(loadRefs, 1500)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const openDialog = (ref: MutableRef, view: DialogView = 'view') => {
    setDialogRef(ref)
    setDialogView(view)
  }

  if (!address) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          My Refs
        </Typography>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Connect your wallet to view and manage your mutable refs.
          </Typography>
        </Paper>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        My Refs
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Mutable onchain key-value store for debugging and tracking user-specific data.
      </Typography>

      {deleteError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDeleteError(null)}>
          {deleteError}
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

      {!loading && !error && refs.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center', mb: 3 }}>
          <Typography variant="body1" color="text.secondary">
            No refs found. Use the form below to create one.
          </Typography>
        </Paper>
      )}

      {!loading && !error && refs.length > 0 && (
        <RefsTable
          refs={refs}
          onOpenDialog={openDialog}
          onOpenEdit={(ref) => openDialog(ref, 'edit')}
          onDelete={(ref) => setDeleteTarget(ref)}
        />
      )}

      {/* Create/Update Form */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Create / Update Ref
        </Typography>
        {existingRefForName && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            A ref named <strong>{formName}</strong> already exists. Submitting will overwrite it.
          </Alert>
        )}
        {submitSuccess && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSubmitSuccess(false)}>
            Ref updated successfully.
          </Alert>
        )}
        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>
            {submitError}
          </Alert>
        )}
        <TextField
          label="Name"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          fullWidth
          margin="normal"
          placeholder="e.g. created-statements"
          size="small"
        />
        <TextField
          label="Value"
          value={formValue}
          onChange={(e) => setFormValue(e.target.value)}
          fullWidth
          multiline
          rows={3}
          margin="normal"
          placeholder="IPFS CID or any string value"
          size="small"
        />
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || !formName || !formValue}
          sx={{ mt: 1 }}
        >
          {submitting ? 'Updating…' : 'Update Ref'}
        </Button>
      </Paper>

      {/* Ref Lookup */}
      <RefLookupSection />

      {/* Ref Detail Dialog */}
      <RefDetailDialog
        open={dialogRef !== null}
        selectedRef={dialogRef}
        initialView={dialogView}
        onClose={() => setDialogRef(null)}
        onSave={handleSaveFromDialog}
        onDelete={handleDeleteFromDialog}
      />

      {/* Direct delete confirmation (from table row) */}
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        refName={deleteTarget?.name ?? ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDirectDelete}
        loading={deleting}
      />
    </Box>
  )
}
