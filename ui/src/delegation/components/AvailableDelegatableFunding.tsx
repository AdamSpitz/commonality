import { useState, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Paper,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import { formatEther } from 'viem'
import {
  getNoteIntentAttestationsByStatement,
  getNote,
  type Note,
} from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { formatNoteAmount, truncateAddress, isEthNote } from '../utils'

interface Props {
  statementCid: string
}

export function AvailableDelegatableFunding({ statementCid }: Props) {
  const machinery = useMachinery()
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const attests = await getNoteIntentAttestationsByStatement(machinery, statementCid)
        if (cancelled) return

        if (attests.length === 0) {
          setNotes([])
          setLoading(false)
          return
        }

        const noteResults = await Promise.all(
          attests.map(a => getNote(machinery, a.noteId).catch(() => null))
        )
        if (cancelled) return

        const activeNotes = noteResults.filter(
          (n): n is Note => n !== null && n.active
        )
        setNotes(activeNotes)
      } catch (err) {
        console.warn('Failed to load available delegatable funding:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [statementCid])

  if (loading) {
    return (
      <Paper sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2">Loading available delegatable funding…</Typography>
      </Paper>
    )
  }

  if (notes.length === 0) return null

  const ethNotes = notes.filter(isEthNote)
  const totalEth = ethNotes.reduce((sum, n) => sum + BigInt(n.amount), 0n)

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Available Delegatable Funding
      </Typography>

      <Typography variant="body1" gutterBottom>
        {formatEther(totalEth)} ETH available in delegatable notes for this cause
      </Typography>

      <TableContainer sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Note</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Depositor</TableCell>
              <TableCell>Current Controller</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {notes.map(note => (
              <TableRow key={note.id}>
                <TableCell>
                  <RouterLink to={`/notes/${note.id}`} style={{ textDecoration: 'none' }}>
                    <Typography
                      variant="body2"
                      color="primary"
                      sx={{ fontFamily: 'monospace' }}
                    >
                      #{note.id}
                    </Typography>
                  </RouterLink>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}
