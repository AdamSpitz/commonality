import { useState, useEffect, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { getDomainUrl } from '../../shared'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { getNoteIntentAttestationsByStatement, getNote, type Note } from '@commonality/sdk/delegation'
import {
  ETH_CURRENCY,
  addCurrencyAmount,
  currencyTotalsToArray,
  type CurrencyAmountBigInt,
} from '@commonality/sdk/utils'
import { useMachinery } from '../../shared'
import {
  formatCurrencyTotals,
  getCurrencyForNote,
} from '../../shared'
import { formatNoteAmount, isDelegate, noteIntentLookupKey, noteScopedKey, noteDetailPath } from '../../delegation'
import { truncateAddress } from '../../shared'

interface Props {
  statementCid: string
}

function sumNoteAmounts(notes: Note[]): CurrencyAmountBigInt[] {
  const totals = new Map<string, CurrencyAmountBigInt>()
  for (const note of notes) {
    addCurrencyAmount(totals, getCurrencyForNote(note), BigInt(note.amount))
  }
  return currencyTotalsToArray(totals)
}

function formatPledgeTotal(totals: CurrencyAmountBigInt[]): string {
  // Empty totals fall back to ETH so zero-state matches native-note local stacks.
  return formatCurrencyTotals(totals, ETH_CURRENCY)
}

/**
 * Delegation / note-intent funding for a cause goal statement.
 * Always shows three pledge rollups, with an optional detail table of notes.
 */
export function DelegatableNotesSection({ statementCid }: Props) {
  const machinery = useMachinery()
  const { address } = useAccount()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    async function load() {
      try {
        const attests = await getNoteIntentAttestationsByStatement(machinery, statementCid)
        if (cancelled) return

        // Different attesters may attest the same note for this statement. Fetch and
        // count each note once so pledge totals and detail rows are not duplicated.
        const noteKeys = [...new Set(attests.map(noteIntentLookupKey))]
        const noteResults = await Promise.all(
          noteKeys.map((key) => getNote(machinery, key).catch(() => null)),
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

    void load()
    return () => {
      cancelled = true
    }
  }, [machinery, statementCid])

  const addressLower = address?.toLowerCase()

  const { totalPledged, youPledged, delegatedToYou } = useMemo(() => {
    const total = sumNoteAmounts(notes)

    // Money you deposited and tagged for this cause (intent attestation),
    // whether you still hold the leaf or have delegated spending authority.
    const yourNotes = addressLower
      ? notes.filter((n) => n.rootOwner.toLowerCase() === addressLower)
      : []

    // Notes others deposited for this cause that you currently direct.
    const toYouNotes = addressLower
      ? notes.filter(
          (n) =>
            n.owner.toLowerCase() === addressLower
            && n.rootOwner.toLowerCase() !== addressLower,
        )
      : []

    return {
      totalPledged: total,
      youPledged: sumNoteAmounts(yourNotes),
      delegatedToYou: sumNoteAmounts(toYouNotes),
    }
  }, [notes, addressLower])

  return (
    <Box sx={{ mb: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Delegation
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Money deposited into delegatable notes and earmarked for this cause&apos;s goal statement.
          Depositors can revoke; the current leaf owner can direct spending.
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              Loading pledges…
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={3}
            flexWrap="wrap"
            useFlexGap
            sx={{ mb: 1 }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Total pledged to this cause
              </Typography>
              <Typography variant="h6">{formatPledgeTotal(totalPledged)}</Typography>
              <Typography variant="caption" color="text.secondary">
                All active notes earmarked for the goal statement
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                You&apos;ve pledged
              </Typography>
              <Typography variant="h6">
                {address ? formatPledgeTotal(youPledged) : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {address
                  ? 'Notes you deposited and tagged for this cause (including when delegated to someone else)'
                  : 'Connect a wallet to see your pledges'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Delegated to you
              </Typography>
              <Typography variant="h6">
                {address ? formatPledgeTotal(delegatedToYou) : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {address
                  ? 'Notes others deposited for this cause that you currently direct'
                  : 'Connect a wallet to see notes delegated to you'}
              </Typography>
            </Box>
          </Stack>
        )}

        <Button
          onClick={() => setDetailsOpen((o) => !o)}
          sx={{ mt: 1.5, textTransform: 'none' }}
          size="small"
        >
          {detailsOpen ? 'Hide' : 'Show'} note details
        </Button>

        <Collapse in={detailsOpen}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Notes earmarked for this cause
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Root Owner is the depositor who can revoke the note; Current Leaf Owner is the wallet
              currently allowed to direct it. Direct means those are the same wallet; Delegated means
              someone else currently directs the funding.
            </Typography>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : error ? null : notes.length === 0 ? (
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
                  {notes.map((note) => (
                    <TableRow key={noteScopedKey(note)}>
                      <TableCell>
                        <a
                          href={getDomainUrl('lazyGiving', noteDetailPath(note), { fallbackHref: '#' })}
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
          </Box>
        </Collapse>
      </Paper>
    </Box>
  )
}
