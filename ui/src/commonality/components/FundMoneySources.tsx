import { Accordion, AccordionDetails, AccordionSummary, Alert, Button, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { getNotesByOwner, type Note } from '@commonality/sdk/delegation'
import { formatNoteAmount, isDelegate, noteDetailPath, noteScopedKey } from '@ui/delegation'
import { truncateAddress, useMachinery } from '@ui/shared'
import { readPersonalFundingBoard, writePersonalFundingBoard } from '../lib/personalFundingBoard'

export function FundMoneySources() {
  const { address } = useAccount()
  const machinery = useMachinery()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(Boolean(address))
  const [error, setError] = useState<string | null>(null)
  const [preferredKey, setPreferredKey] = useState<string | null>(null)

  useEffect(() => {
    const refresh = () => {
      const source = readPersonalFundingBoard(address)?.preferredMoneySource
      setPreferredKey(source ? `${source.noteContract.toLowerCase()}:${source.noteId}` : null)
    }
    refresh()
    window.addEventListener('causestarter:personal-funding-board', refresh)
    return () => window.removeEventListener('causestarter:personal-funding-board', refresh)
  }, [address])

  useEffect(() => {
    let cancelled = false
    if (!address) {
      setNotes([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    void getNotesByOwner(machinery, address)
      .then((loaded) => {
        if (!cancelled) {
          setNotes(loaded.filter((note) => note.active && BigInt(note.amount) > 0n))
          setError(null)
        }
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load available funds')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [address, machinery])

  if (!address) return null

  const entrustedCount = notes.filter(isDelegate).length
  const hasBoard = Boolean(readPersonalFundingBoard(address))

  const prefer = (note: Note) => {
    if (!address) return
    const board = readPersonalFundingBoard(address)
    if (!board) return
    writePersonalFundingBoard(address, {
      ...board,
      preferredMoneySource: { noteContract: note.contractAddress, noteId: note.id },
    })
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }} data-testid="fund-money-sources">
      <Typography variant="h6" component="h2" sx={{ fontWeight: 750 }}>Money available to direct</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Choose an eligible fund when you open a project. This includes money a donor entrusted to your judgment.
      </Typography>

      {loading && <CircularProgress size={18} sx={{ mt: 2 }} />}
      {error && <Alert severity="warning" sx={{ mt: 2 }}>{error}</Alert>}
      {!loading && !error && notes.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          No active funds are available. You can still contribute directly from your wallet on a project page.
        </Typography>
      )}
      {!loading && !error && notes.length > 0 && (
        <Accordion disableGutters elevation={0} slotProps={{ transition: { unmountOnExit: true } }} sx={{ mt: 1.5, '&:before': { display: 'none' }, bgcolor: 'transparent' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0, minHeight: 40 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={`${notes.length} active ${notes.length === 1 ? 'fund' : 'funds'}`} size="small" />
              {entrustedCount > 0 && <Chip label={`${entrustedCount} entrusted to you`} color="info" size="small" />}
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 0, pt: 0 }}>
            <Stack spacing={1}>
              {notes.map((note) => (
                <Stack key={noteScopedKey(note)} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}>
                  <Typography variant="body2">
                    Fund #{note.id} · {formatNoteAmount(note)}{isDelegate(note) ? ` · Entrusted by ${truncateAddress(note.rootOwner)}` : ' · Your fund'}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant={preferredKey === noteScopedKey(note) ? 'contained' : 'text'}
                      disabled={!hasBoard || preferredKey === noteScopedKey(note)}
                      onClick={() => prefer(note)}
                    >
                      {preferredKey === noteScopedKey(note) ? 'Preferred' : 'Use by default'}
                    </Button>
                    <Button component={RouterLink} to={noteDetailPath(note)} size="small">View fund</Button>
                  </Stack>
                </Stack>
              ))}
            </Stack>
            {!hasBoard && (
              <Typography variant="caption" color="text.secondary">Set up your funding board before choosing a default fund.</Typography>
            )}
          </AccordionDetails>
        </Accordion>
      )}
    </Paper>
  )
}
