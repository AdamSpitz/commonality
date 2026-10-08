import { useRef, useState } from 'react'
import { Alert, Button, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { CauseCard } from '../components/CauseCard'
import {
  createCausePath,
  deleteCause,
  downloadCausesBundle,
  importCausesFromJson,
  listCauses,
} from '../lib/causeModel'
import { useSession } from '../lib/session'

export function CausesPage() {
  const navigate = useNavigate()
  const { user } = useSession()
  const fileRef = useRef<HTMLInputElement>(null)
  const [tick, setTick] = useState(0)
  const [importError, setImportError] = useState<string | null>(null)
  const [importOk, setImportOk] = useState<string | null>(null)
  void tick
  const causes = listCauses()

  const handleImportFile = async (file: File) => {
    setImportError(null)
    setImportOk(null)
    try {
      const text = await file.text()
      const result = importCausesFromJson(text, { author: user?.username })
      setTick((n) => n + 1)
      if (result.kind === 'bundle') {
        setImportOk(`Imported bundle: ${result.causes.length} cause(s).`)
        navigate('/causes')
      } else {
        const cause = result.causes[0]!
        setImportOk(`Imported “${cause.title}”.`)
        navigate(`/cause/${cause.id}`)
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
    }
  }

  return (
    <Stack spacing={2.5} data-testid="causes-page">
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Stack spacing={0.5}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
            Causes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            A cause works toward a goal. Beliefs motivate the work; projects deliver progress.
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} flexShrink={0} flexWrap="wrap" useFlexGap>
          <Button
            variant="outlined"
            disabled={causes.length === 0}
            onClick={() => {
              try {
                downloadCausesBundle()
                setImportOk(`Exported bundle of ${causes.length} cause(s).`)
              } catch (err) {
                setImportError(err instanceof Error ? err.message : 'Bundle export failed')
              }
            }}
            sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 600, minHeight: 40 }}
            data-testid="causes-export-bundle"
          >
            Export all
          </Button>
          <Button
            variant="outlined"
            onClick={() => fileRef.current?.click()}
            sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 600, minHeight: 40 }}
            data-testid="causes-import"
          >
            Import
          </Button>
          <Button
            variant="contained"
            onClick={() => navigate(createCausePath())}
            sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700, minHeight: 40 }}
            data-testid="causes-start"
          >
            Launch
          </Button>
        </Stack>
      </Stack>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void handleImportFile(file)
        }}
      />

      {importError && <Alert severity="error" onClose={() => setImportError(null)}>{importError}</Alert>}
      {importOk && <Alert severity="success" onClose={() => setImportOk(null)}>{importOk}</Alert>}

      {causes.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No causes on this device yet. Launch one, or import a JSON file / multi-cause bundle.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {causes.map((cause) => (
            <CauseCard
              key={cause.id}
              cause={cause}
              onDelete={() => {
                if (window.confirm(
                  `Delete cause “${cause.title}” from this device? `
                  + 'On-chain published statements stay; only this local cause record is removed.',
                )) {
                  deleteCause(cause.id)
                  setTick((n) => n + 1)
                }
              }}
            />
          ))}
        </Stack>
      )}
    </Stack>
  )
}
