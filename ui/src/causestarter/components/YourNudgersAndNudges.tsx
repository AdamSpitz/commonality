import { useEffect, useState } from 'react'
import { Alert, Box, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import { HeaderInfoTip } from './HeaderInfoTip'
import { Link as RouterLink } from 'react-router-dom'
import { getStatementWithContent } from '@commonality/sdk/conceptspace'
import {
  foldNudgeBatchPublications,
  getNudgerPublications,
  type FoldedNudge,
  type NudgeBatchPublication,
} from '@commonality/sdk/nudger-publications'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { useTrustedNudgers, type TrustedNudgerEntry } from '@ui/shared'
import { useMachinery } from '../lib/useMachinery'

const MAX_NUDGES = 10

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function previewStatement(content: string | undefined): string {
  const firstLine = content?.trim().split('\n')[0]?.trim() ?? ''
  return firstLine.slice(0, 200)
}

function nudgerLabel(entry: TrustedNudgerEntry): string {
  return entry.name?.trim() || shortAddress(entry.address)
}

export function YourNudgersAndNudges() {
  const machinery = useMachinery()
  const trustedNudgers = useTrustedNudgers()
  const [nudges, setNudges] = useState<FoldedNudge[]>([])
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(trustedNudgers.length > 0)
  const [error, setError] = useState<string | null>(null)

  const addressKey = trustedNudgers.map((entry) => entry.address.toLowerCase()).join(',')

  useEffect(() => {
    const addresses = addressKey ? addressKey.split(',') : []
    let cancelled = false
    if (addresses.length === 0) {
      setNudges([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const publications = await getNudgerPublications(machinery, addresses)
        const folded = foldNudgeBatchPublications(
          publications.filter((publication): publication is NudgeBatchPublication => publication.kind === 'nudge-batch'),
        )
        const recent = [...folded]
          .sort((a, b) => b.publishedAt - a.publishedAt || b.confidence - a.confidence)
          .slice(0, MAX_NUDGES)
        if (cancelled) return
        setNudges(recent)

        const cids = [...new Set(recent.flatMap((nudge) => [nudge.suggestedStatementCid, nudge.targetStatementCid]))]
        const nextPreviews: Record<string, string> = {}
        await Promise.all(cids.map(async (cid) => {
          const statement = await getStatementWithContent(machinery, cid as IpfsCidV1).catch(() => null)
          nextPreviews[cid] = previewStatement(statement?.content?.content) || shortAddress(cid)
        }))
        if (!cancelled) setPreviews(nextPreviews)
      } catch {
        if (!cancelled) setError('Could not load nudges from your subscribed suggesters.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
    // trustedNudgers is read only for labels after fetch; reload when the address set changes.
  }, [machinery, addressKey])

  return (
    <Stack spacing={2} data-testid="home-nudgers">
      <Typography variant="h4" component="h2" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
        Suggesters
      </Typography>
      <Box>
        <Stack direction="row" alignItems="center">
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Suggesters you've subscribed to
          </Typography>
          <HeaderInfoTip
            title="Opt-ins stay on this device. Suggestions from these services appear here and on statement pages."
            label="About subscribed suggesters"
          />
        </Stack>
      </Box>

      {trustedNudgers.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No suggesters yet. Opt in on a cause if you would sign a better wording but
          do not want to hunt for it — a mediator can nudge you when a bridge fits.
        </Alert>
      ) : (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {trustedNudgers.map((entry) => (
            <Chip
              key={entry.address}
              label={nudgerLabel(entry)}
              variant="outlined"
              data-testid="home-nudger"
            />
          ))}
        </Stack>
      )}

      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Recent suggestions
        </Typography>
      </Box>

      {loading && (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Loading suggestions…
          </Typography>
        </Stack>
      )}

      {error && <Alert severity="warning">{error}</Alert>}

      {!loading && !error && trustedNudgers.length > 0 && nudges.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No published suggestions from these suggesters yet.
        </Typography>
      )}

      {!loading && nudges.map((nudge) => {
        const nudger = trustedNudgers.find(
          (entry) => entry.address.toLowerCase() === nudge.nudger.toLowerCase(),
        )
        return (
          <Paper
            key={`${nudge.nudger}:${nudge.targetStatementCid}:${nudge.suggestedStatementCid}`}
            elevation={0}
            data-testid="home-nudge"
            sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
          >
            <Typography variant="caption" color="text.secondary">
              {nudger ? nudgerLabel(nudger) : shortAddress(nudge.nudger)}
            </Typography>
            <Typography
              component={RouterLink}
              to={`/statement/${nudge.suggestedStatementCid}`}
              variant="subtitle2"
              sx={{ display: 'block', mt: 0.5, fontWeight: 700, color: 'inherit', textDecoration: 'none' }}
            >
              {previews[nudge.suggestedStatementCid] ?? shortAddress(nudge.suggestedStatementCid)}
            </Typography>
            {nudge.reason && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {nudge.reason}
              </Typography>
            )}
          </Paper>
        )
      })}
    </Stack>
  )
}
