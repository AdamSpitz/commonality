import { Link, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import type { RefUpdate } from '@commonality/sdk/mutable-refs'
import { formatRosterAge, stableCausePath, type StableCauseId } from '../lib/causeRoster'

interface RosterHistoryProps {
  stable: StableCauseId
  history: RefUpdate[]
  currentVersionCid?: string
  pinnedVersionCid?: string
}

/**
 * Append-only roster history from MutableRefUpdater ref_updates.
 * Newest first (matches getUserRefHistory).
 */
export function RosterHistory({
  stable,
  history,
  currentVersionCid,
  pinnedVersionCid,
}: RosterHistoryProps) {
  if (history.length === 0) return null

  const latest = history[0]
  const latestAge = latest ? formatRosterAge(Number(latest.timestamp) * 1000) : null
  // On a pinned route, CauseDetailPage's loaded roster CID is the version on screen,
  // not the MutableRef tip. History is newest-first, so keep "current" attached to
  // the tip and offer a route back to it even while an older version is displayed.
  const effectiveCurrentVersionCid = pinnedVersionCid ? latest?.value : currentVersionCid

  return (
    <Stack spacing={0.75} data-testid="roster-history" sx={{ pt: 0.5 }}>
      {latestAge && (
        <Typography variant="caption" color="text.secondary">
          Updated {latestAge}
          {history.length > 1 ? ` · ${history.length} versions` : ''}
        </Typography>
      )}
      {history.length > 1 && (
        <Stack spacing={0.25}>
          {history.slice(0, 8).map((update) => {
            const cid = update.value
            const isCurrent = cid === effectiveCurrentVersionCid
            const isPinned = cid === pinnedVersionCid
            return (
              <Typography key={update.id} variant="caption" color="text.secondary">
                <Link
                  component={RouterLink}
                  to={stableCausePath(stable, cid)}
                  underline="hover"
                  sx={{ fontFamily: 'monospace' }}
                >
                  {cid.slice(0, 16)}…
                </Link>
                {' · '}
                {formatRosterAge(Number(update.timestamp) * 1000)}
                {isCurrent ? ' · current' : ''}
                {isPinned && !isCurrent ? ' · viewing' : ''}
              </Typography>
            )
          })}
        </Stack>
      )}
    </Stack>
  )
}
