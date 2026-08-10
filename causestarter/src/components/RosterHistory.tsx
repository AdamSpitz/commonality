import { Alert, Link, Stack, Typography } from '@mui/material'
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

  return (
    <Stack spacing={1} data-testid="roster-history">
      {latestAge && (
        <Typography variant="body2" color="text.secondary">
          Roster changed {latestAge}
          {history.length > 1 ? ` · ${history.length} versions` : ''}
        </Typography>
      )}
      {pinnedVersionCid && pinnedVersionCid !== currentVersionCid && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Viewing a pinned version.
          {' '}
          <Link component={RouterLink} to={stableCausePath(stable)} underline="hover">
            Open current
          </Link>
        </Alert>
      )}
      {history.length > 1 && (
        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Previous versions
          </Typography>
          {history.slice(0, 8).map((update) => {
            const cid = update.value
            const isCurrent = cid === currentVersionCid
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
