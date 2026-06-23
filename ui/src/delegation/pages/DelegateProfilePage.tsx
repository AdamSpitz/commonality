import { useEffect, useState } from 'react'
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Link, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { formatEther, isAddress } from 'viem'
import { getNotesByOwner, type Note } from '@commonality/sdk'
import { useMachinery } from '../../shared'
import { formatNoteAmount, isDelegate, noteDetailPath, truncateAddress } from '../utils'

function DelegateNoteCard({ note }: { note: Note }) {
  const isDelegatedFromSomeoneElse = isDelegate(note)

  return (
    <Card>
      <CardContent>
        <Stack spacing={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="subtitle1">
                <Link component={RouterLink} to={noteDetailPath(note)} underline="hover">
                  Fund #{note.id}
                </Link>
              </Typography>
              <Typography variant="h6">{formatNoteAmount(note)}</Typography>
            </Box>
            <Chip
              label={isDelegatedFromSomeoneElse ? `Delegated from ${truncateAddress(note.rootOwner)}` : 'Own fund'}
              color={isDelegatedFromSomeoneElse ? 'info' : 'default'}
              size="small"
            />
          </Box>
          {note.tokenId !== '0' && (
            <Typography variant="body2" color="text.secondary">
              Holds project/content token {note.tokenId} from {truncateAddress(note.token)}.
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

export function DelegateProfilePage() {
  const { address } = useParams<{ address: string }>()
  const machinery = useMachinery()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!address || !isAddress(address)) {
        setError('Invalid delegate address')
        setNotes([])
        return
      }

      setLoading(true)
      setError(null)
      try {
        const ownedNotes = await getNotesByOwner(machinery, address)
        if (!cancelled) setNotes(ownedNotes)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load delegate track record')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [address, machinery])

  const delegatedNotes = notes.filter(isDelegate)
  const totalControlled = notes.reduce((sum, note) => sum + BigInt(note.amount), 0n)

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            LazyGiving delegate profile
          </Typography>
          <Typography variant="h4" component="h1" gutterBottom>
            Delegate {address && isAddress(address) ? truncateAddress(address) : 'profile'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Public delegate profiles live on LazyGiving because delegation is a funding feature, not a standalone domain. This page shows the funds this address currently controls, including funds delegated by other donors and ERC1155 notes acquired by spending delegated funds.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={24} />
            <Typography>Loading delegate track record…</Typography>
          </Box>
        )}

        {!loading && !error && (
          <>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Controlled funds</Typography>
                  <Typography variant="h5">{notes.length}</Typography>
                </CardContent>
              </Card>
              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Acting as delegate</Typography>
                  <Typography variant="h5">{delegatedNotes.length}</Typography>
                </CardContent>
              </Card>
              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Current ETH balance</Typography>
                  <Typography variant="h5">{formatEther(totalControlled)} ETH</Typography>
                </CardContent>
              </Card>
            </Stack>

            {notes.length === 0 ? (
              <Alert severity="info">No active funds are currently controlled by this address.</Alert>
            ) : (
              <Stack spacing={2}>
                {notes.map((note) => (
                  <DelegateNoteCard key={note.id} note={note} />
                ))}
              </Stack>
            )}
          </>
        )}
      </Stack>
    </Box>
  )
}

export default DelegateProfilePage
