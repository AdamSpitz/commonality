import { useEffect, useState } from 'react'
import { Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, Typography } from '@mui/material'
import { loadRevocableClosure, revokeMany, type RevocableNote } from '@commonality/sdk/delegation'
import type { DelegatableNotesContract } from '@commonality/sdk/delegation'

type WriteClients = Parameters<typeof revokeMany>[0]

export function RevokeClosureDialog({
  open,
  mode,
  originNoteId,
  contract,
  clients,
  logSource,
  onClose,
  onFinished,
}: {
  open: boolean
  mode: 'takeback' | 'handback'
  originNoteId: bigint | null
  contract: DelegatableNotesContract | null
  clients: WriteClients | null
  logSource: { getContractEvents: Parameters<typeof loadRevocableClosure>[0]['getContractEvents'] } | null
  onClose: () => void
  onFinished: () => Promise<void>
}) {
  const [rows, setRows] = useState<Array<RevocableNote & { checked: boolean }>>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [remaining, setRemaining] = useState<string[] | null>(null)

  useEffect(() => {
    if (!open || originNoteId === null || !contract || !logSource) return
    let cancelled = false
    setError(null)
    setRemaining(null)
    loadRevocableClosure(logSource, contract.address, originNoteId)
      .then((notes) => {
        if (cancelled) return
        const next = notes.map((note) => ({
          ...note,
          checked: mode === 'takeback' || note.noteId === originNoteId,
        }))
        setRows(next)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not read the notes on chain')
      })
    return () => { cancelled = true }
  }, [open, originNoteId, contract, logSource, mode])

  function toggle(id: string) {
    setRows((current) => current.map((note) => note.id === id ? { ...note, checked: !note.checked } : note))
  }

  function toggleAll(checked: boolean) {
    setRows((current) => current.map((note) => ({ ...note, checked })))
  }

  function selectedFrom(notes: RevocableNote[], chosen: Set<string>, skipped: Set<string>) {
    const allowed = new Set(chosen)
    let grew = true
    while (grew) {
      grew = false
      for (const note of notes) {
        if (skipped.has(note.id) || allowed.has(note.id)) continue
        if (note.parentId && allowed.has(note.parentId)) {
          allowed.add(note.id)
          grew = true
        }
      }
    }
    return notes.filter((note) => allowed.has(note.id) && !skipped.has(note.id))
  }

  async function submit() {
    if (!contract || !clients || !logSource || originNoteId === null) return
    const chosen = new Set(rows.filter((note) => note.checked).map((note) => note.id))
    const skipped = new Set(rows.filter((note) => !note.checked).map((note) => note.id))
    setBusy(true)
    setError(null)
    try {
      let confirmed = chosen
      for (let pass = 0; pass < 8; pass++) {
        const latest = await loadRevocableClosure(logSource, contract.address, originNoteId)
        const batch = selectedFrom(latest, confirmed, skipped)
        if (batch.length === 0) {
          setRemaining([])
          await onFinished()
          onClose()
          return
        }
        await revokeMany(clients, contract, { notes: batch.map((note) => ({ noteId: note.noteId, owners: note.owners })) })
        confirmed = new Set([...confirmed, ...batch.map((note) => note.id)])
      }
      const latest = await loadRevocableClosure(logSource, contract.address, originNoteId)
      setRemaining(selectedFrom(latest, confirmed, skipped).map((note) => note.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revocation failed')
      const latest = await loadRevocableClosure(logSource, contract.address, originNoteId).catch(() => [])
      setRemaining(selectedFrom(latest, chosen, skipped).map((note) => note.id))
    } finally {
      setBusy(false)
    }
  }

  const title = mode === 'takeback' ? 'Takeback' : 'Hand back'
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mt: 1, mb: 1 }}>
          {mode === 'takeback'
            ? 'Every note still delegated from this one starts selected. Uncheck any you want to leave with him.'
            : 'Only this note starts selected. Check the others to hand those back too.'}
        </Typography>
        <FormControlLabel
          control={<Checkbox checked={rows.length > 0 && rows.every((note) => note.checked)} onChange={(event) => toggleAll(event.target.checked)} />}
          label="All of these"
        />
        <Stack>
          {rows.map((note) => (
            <FormControlLabel
              key={note.id}
              control={<Checkbox checked={note.checked} onChange={() => toggle(note.id)} />}
              label={`Fund #${note.id}`}
            />
          ))}
          {rows.length === 0 && !error && <Typography variant="body2">Nothing delegated is left in this set.</Typography>}
        </Stack>
        {remaining && remaining.length > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Still delegated: {remaining.map((id) => `#${id}`).join(', ')}. The authority is not gone.
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy || rows.every((note) => !note.checked)}>
          Revoke selected
        </Button>
      </DialogActions>
    </Dialog>
  )
}
