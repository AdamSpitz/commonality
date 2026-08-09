import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { getDomainUrl } from '../../shared'
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
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

export interface DelegatableNotesSectionProps {
  statementCid: string
  /**
   * `summary` — three rollups only. Optional `to` makes the card a same-app link.
   * `detail` — rollups plus the full earmarked-notes table.
   * Defaults to summary when `to` is supplied, otherwise detail for legacy hosts.
   */
  variant?: 'summary' | 'detail'
  /** When set on the summary variant, the whole card navigates here (react-router path). */
  to?: string
}

function sumNoteAmounts(notes: Note[]): CurrencyAmountBigInt[] {
  const totals = new Map<string, CurrencyAmountBigInt>()
  for (const note of notes) {
    addCurrencyAmount(totals, getCurrencyForNote(note), BigInt(note.amount))
  }
  return currencyTotalsToArray(totals)
}

function formatPledgeTotal(totals: CurrencyAmountBigInt[]): string {
  // No nonzero balance: say "nothing" instead of inventing a default currency (e.g. "0 ETH").
  const nonzero = totals.filter((entry) => entry.amount > 0n)
  if (nonzero.length === 0) return 'nothing'
  return formatCurrencyTotals(nonzero)
}

/**
 * Earmarked funds (delegatable notes tagged for a cause goal statement).
 * Summary rollups for linked CauseStarter cards; full detail for existing hosts.
 */
export function DelegatableNotesSection({
  statementCid,
  variant,
  to,
}: DelegatableNotesSectionProps) {
  const machinery = useMachinery()
  const { address } = useAccount()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const resolvedVariant = variant ?? (to ? 'summary' : 'detail')
  const isDetail = resolvedVariant === 'detail'
  const isLink = Boolean(to) && !isDetail

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
          console.error('Failed to load earmarked funds:', err)
          setError(err instanceof Error ? err.message : 'Failed to load earmarked funds')
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

  const paperSx = {
    p: 3,
    textDecoration: 'none',
    color: 'inherit',
    display: 'block',
    ...(isLink
      ? {
          cursor: 'pointer',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          border: '1px solid',
          borderColor: 'divider',
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: 1,
          },
        }
      : {}),
  } as const

  const content = (
    <>
      <Stack
        direction="row"
        alignItems="baseline"
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 0.5 }}
      >
        <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
          Earmarked funds
        </Typography>
        {isLink && (
          <Typography variant="body2" color="primary" sx={{ flexShrink: 0, fontWeight: 600 }}>
            Details →
          </Typography>
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {isDetail
          ? 'Money deposited into notes and tagged for this cause. Depositors can revoke; the current holder can direct spending.'
          : 'Money tagged for this cause that depositors can revoke and holders can direct.'}
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
          sx={{ mb: isDetail ? 3 : 0 }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Total pledged
            </Typography>
            <Typography variant="h6">{formatPledgeTotal(totalPledged)}</Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              {address ? "You've pledged" : 'Your pledge'}
            </Typography>
            <Typography variant="h6">
              {address ? formatPledgeTotal(youPledged) : '—'}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Directed to you
            </Typography>
            <Typography variant="h6">
              {address ? formatPledgeTotal(delegatedToYou) : '—'}
            </Typography>
          </Box>
        </Stack>
      )}

      {isDetail && !loading && !error && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Notes earmarked for this cause
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Root Owner is the depositor who can revoke the note; Current Leaf Owner is the wallet
            currently allowed to direct it. Direct means those are the same wallet; Delegated means
            someone else currently directs the funding.
          </Typography>

          {notes.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No notes earmarked for this cause yet.
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Note ID</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Root Owner (Depositor)</TableCell>
                  <TableCell>Current Leaf Owner</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {notes.map((note) => (
                  <TableRow key={noteScopedKey(note)}>
                    <TableCell>
                      <a
                        href={getDomainUrl('lazyGiving', noteDetailPath(note), { fallbackHref: '#' })}
                        style={{ textDecoration: 'none' }}
                        onClick={(e) => e.stopPropagation()}
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
      )}
    </>
  )

  return (
    <Box sx={{ mb: 3 }}>
      {isLink && to ? (
        <Paper component={RouterLink} to={to} elevation={0} sx={paperSx}>
          {content}
        </Paper>
      ) : (
        <Paper elevation={0} sx={{ ...paperSx, border: '1px solid', borderColor: 'divider' }}>
          {content}
        </Paper>
      )}
    </Box>
  )
}
