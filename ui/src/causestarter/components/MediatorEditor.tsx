import { useEffect, useState } from 'react'
import { Alert, Button, Stack, TextField, Typography } from '@mui/material'
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
  disabled?: boolean
  onChange: (mediator: CauseMediator | undefined) => void
}

/**
 * Form for the optional organizer-operated mediator, attached after its
 * bridge-creator artifact is deployed. Lives on its own page rather than inline
 * on the cause: most causes never set one, and it shouldn't compete with the
 * statements for attention.
 */
export function MediatorEditor({ mediator, disabled = false, onChange }: MediatorEditorProps) {
  const [draft, setDraft] = useState<CauseMediator>(mediator ?? EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setDraft(mediator ?? EMPTY)
  }, [mediator])

  const field = (key: keyof CauseMediator) => ({
    value: draft[key],
    disabled,
    onChange: (event: { target: { value: string } }) => {
      setSaved(false)
      setDraft((current) => ({ ...current, [key]: event.target.value }))
    },
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
    setSaved(true)
  }

  return (
    <Stack spacing={1.5} data-testid="cause-mediator-editor">
      <Typography variant="body2" color="text.secondary">
        After deploying your bridge-creator artifact, attach its public identity here.
        Supporters will then see featured bridges and an opt-in link for this cause.
        Clear all four fields to detach it.
      </Typography>
      <TextField label="Mediator name" size="small" fullWidth {...field('name')} />
      <TextField label="Mediator description" size="small" multiline minRows={2} fullWidth {...field('description')} />
      <TextField label="Mediator signer address" size="small" placeholder="0x…" fullWidth {...field('address')} />
      <TextField label="Public mediator service URL" size="small" placeholder="https://mediator.example" fullWidth {...field('serviceUrl')} />
      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
      {saved && !error && (
        <Alert severity="success" sx={{ borderRadius: 2 }} data-testid="cause-mediator-saved">
          Saved on this device. Publish the cause again to put it in the roster supporters read.
        </Alert>
      )}
      <Button
        variant="contained"
        onClick={handleSave}
        disabled={disabled}
        sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
      >
        Save mediator
      </Button>
    </Stack>
  )
}
