import { useState, useEffect } from 'react'
import { getDomainUrl } from '../../domains/domainUrls'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import {
  getNoteIntentAttestationsByStatement,
  getNote,
  type Note,
} from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { formatNoteAmount, isDelegate, noteIntentLookupKey, noteScopedKey, truncateAddress } from '../../delegation/utils'

interface Props {
  statementCid: string
}

export function DelegatableNotesSection({ statementCid }: Props) {
  const machinery = useMachinery()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)

    async function load() {
      try {
        const attests = await getNoteIntentAttestationsByStatement(machinery, statementCid)
        if (cancelled) return

        const noteResults = await Promise.all(
          attests.map(a => getNote(machinery, noteIntentLookupKey(a)).catch(() => null))
        )
        if (cancelled) return

        setNotes(noteResults.filter((n): n is Note => n !== null && n.active))
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load delegatable notes:', err)
          setError(err instanceof Error ? err.message : 'Failed to load delegatable notes')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [machinery, open, statementCid])

  return (
    <Box sx={{ mb: 3 }}>
      <Button onClick={() => setOpen(o => !o)}>
        {open ? 'Hide' : 'Show'} Available Delegatable Notes
      </Button>

      <Collapse in={open}>
        <Paper sx={{ p: 3, mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Available Delegatable Notes
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Delegatable notes intended for this cause, grouped here regardless of which token
            each note uses.
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : notes.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No delegatable notes intended for this cause.
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Note ID</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Root Owner (Depositor)</TableCell>
                  <TableCell>Current Leaf Owner</TableCell>
                  <TableCell>Delegation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {notes.map(note => (
                  <TableRow key={noteScopedKey(note)}>
                    <TableCell>
                      <a
                        href={getDomainUrl('lazyGiving', `/delegation/notes/${note.id}`, { fallbackHref: '#' })}
                        style={{ textDecoration: 'none' }}
                      >
                        <Typography
                          variant="body2"
                          color="primary"
                          sx={{ fontFamily: 'monospace' }}
                        >
                          #{note.id}
                        </Typography>
                      </a>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{formatNoteAmount(note)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {truncateAddress(note.rootOwner)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {truncateAddress(note.owner)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {isDelegate(note) ? (
                        <Chip label="Delegated" size="small" color="info" />
                      ) : (
                        <Chip label="Direct" size="small" variant="outlined" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      </Collapse>
    </Box>
  )
}
