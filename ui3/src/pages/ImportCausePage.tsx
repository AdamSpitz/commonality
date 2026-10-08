import { useEffect, useState } from 'react'
import { Alert, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import {
  decodePortableSharePayload,
  importCausesFromJson,
} from '../lib/causeModel'
import { useSession } from '../lib/session'

/**
 * Opened from a portable share link (`/import-cause?d=...`) or empty for instructions.
 */
export function ImportCausePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useSession()
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [importedIds, setImportedIds] = useState<string[]>([])

  const payload = params.get('d')

  useEffect(() => {
    if (!payload) {
      setStatus('idle')
      return
    }
    let cancelled = false
    setStatus('working')
    setMessage(null)
    try {
      const raw = decodePortableSharePayload(payload)
      const result = importCausesFromJson(raw, { author: user?.username })
      if (cancelled) return
      setImportedIds(result.causes.map((c) => c.id))
      setStatus('done')
      setMessage(
        result.kind === 'bundle'
          ? `Imported ${result.causes.length} causes from share link.`
          : `Imported “${result.causes[0]?.title ?? 'cause'}”.`,
      )
      if (result.causes.length === 1) {
        navigate(`/cause/${result.causes[0]!.id}`, { replace: true })
      }
    } catch (err) {
      if (cancelled) return
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Could not import shared cause')
    }
    return () => {
      cancelled = true
    }
  }, [payload, user?.username, navigate])

  return (
    <Stack spacing={2} data-testid="import-cause-page">
      <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
        Import cause
      </Typography>

      {!payload && (
        <>
          <Typography variant="body2" color="text.secondary">
            Open a portable share link (Copy portable link on a cause), or use Causes → Import
            with a JSON file / multi-cause bundle.
          </Typography>
          <Button component={RouterLink} to="/causes" sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
            Back to causes
          </Button>
        </>
      )}

      {status === 'working' && (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={18} />
          <Typography variant="body2">Importing shared cause…</Typography>
        </Stack>
      )}

      {status === 'error' && message && (
        <Alert severity="error">{message}</Alert>
      )}

      {status === 'done' && message && (
        <>
          <Alert severity="success">{message}</Alert>
          <Stack spacing={1}>
            {importedIds.map((id) => (
              <Button
                key={id}
                component={RouterLink}
                to={`/cause/${id}`}
                sx={{ textTransform: 'none', justifyContent: 'flex-start' }}
              >
                Open cause
              </Button>
            ))}
          </Stack>
        </>
      )}
    </Stack>
  )
}
