import { useEffect, useState } from 'react'
import { Alert, Button, Collapse, Paper, Stack, TextField, Typography } from '@mui/material'
import type { CauseMediator } from '../lib/causeStore'

const EMPTY: CauseMediator = { name: '', description: '', address: '', serviceUrl: '' }

/** All four fields, or none — a half-filled mediator can't be contacted or trusted. */
export function validateMediator(mediator: CauseMediator): string | null {
  const values = [mediator.name, mediator.description, mediator.address, mediator.serviceUrl]
    .map((value) => value.trim())
  if (values.every((value) => !value)) return null
  if (values.some((value) => !value)) return 'Complete all mediator fields, or clear all of them.'
  if (!/^0x[0-9a-fA-F]{40}$/.test(mediator.address.trim())) {
    return 'Mediator address must be a 0x-prefixed Ethereum address.'
  }
  try {
    const url = new URL(mediator.serviceUrl.trim())
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('bad protocol')
  } catch {
    return 'Mediator service URL must be a valid HTTP or HTTPS URL.'
  }
  return null
}

function isEmpty(mediator: CauseMediator): boolean {
  return Object.values(mediator).every((value) => !value.trim())
}

interface MediatorEditorProps {
  mediator: CauseMediator | undefined
  onChange: (mediator: CauseMediator | undefined) => void
}

/**
 * Optional founder-operated mediator, attached after its bridge-creator
 * artifact is deployed. Collapsed by default: most causes never set one, and it
 * shouldn't compete with the issues for attention.
 */
export function MediatorEditor({ mediator, onChange }: MediatorEditorProps) {
  const [open, setOpen] = useState(Boolean(mediator))
  const [draft, setDraft] = useState<CauseMediator>(mediator ?? EMPTY)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDraft(mediator ?? EMPTY)
  }, [mediator])

  const field = (key: keyof CauseMediator) => ({
    value: draft[key],
    onChange: (event: { target: { value: string } }) =>
      setDraft((current) => ({ ...current, [key]: event.target.value })),
  })

  const handleSave = () => {
    const problem = validateMediator(draft)
    setError(problem)
    if (problem) return
    onChange(isEmpty(draft) ? undefined : {
      name: draft.name.trim(),
      description: draft.description.trim(),
      address: draft.address.trim(),
      serviceUrl: draft.serviceUrl.trim().replace(/\/+$/, ''),
    })
    setOpen(false)
  }

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Mediator (optional)</Typography>
        <Button size="small" onClick={() => setOpen((value) => !value)} sx={{ textTransform: 'none' }}>
          {open ? 'Close' : mediator ? 'Edit' : 'Add'}
        </Button>
      </Stack>

      <Collapse in={open}>
        <Stack spacing={1.5} sx={{ mt: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            After deploying your bridge-creator artifact, attach its public identity here.
            Supporters will then see featured bridges and an opt-in link for this cause.
          </Typography>
          <TextField label="Mediator name" size="small" fullWidth {...field('name')} />
          <TextField label="Mediator description" size="small" multiline minRows={2} fullWidth {...field('description')} />
          <TextField label="Mediator signer address" size="small" placeholder="0x…" fullWidth {...field('address')} />
          <TextField label="Public mediator service URL" size="small" placeholder="https://mediator.example" fullWidth {...field('serviceUrl')} />
          {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
          <Button variant="contained" onClick={handleSave} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
            Save mediator
          </Button>
        </Stack>
      </Collapse>
    </Paper>
  )
}
