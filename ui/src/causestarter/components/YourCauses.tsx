import SearchIcon from '@mui/icons-material/Search'
import {
  Alert, Box, Button, CircularProgress, InputAdornment, MenuItem, Stack,
  Tab, Tabs, TextField, Typography,
} from '@mui/material'
import { useMemo, useState, type ReactNode } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { HeaderInfoTip } from '../../shared'
import {
  causeLastOpenedAt, isCauseArchived, readCauseLibrary, setCauseArchived,
} from '../lib/causeLibrary'
import {
  causeTitle, createCausePath, isLive, type CauseDraft,
} from '../lib/causeStore'
import { CauseCard } from './CauseCard'

type View = 'recent' | 'organizing' | 'saved' | 'drafts' | 'archived'
type Sort = 'recent' | 'alphabetical' | 'newest'
const RECENT_LIMIT = 10

export function YourCauses({
  causes, loading, removeBookmark, footer, testId, headingComponent = 'h1', compact = false,
}: {
  causes: CauseDraft[]
  loading: boolean
  removeBookmark?: (cause: CauseDraft) => void
  footer?: ReactNode
  testId?: string
  headingComponent?: 'h1' | 'h2'
  compact?: boolean
}) {
  const navigate = useNavigate()
  const { address } = useAccount()
  const [view, setView] = useState<View>('recent')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('recent')
  const [library, setLibrary] = useState(readCauseLibrary)
  const [locallyRemoved, setLocallyRemoved] = useState<Set<string>>(() => new Set())
  const addressLc = address?.toLowerCase()

  const groups = useMemo(() => {
    const visible = causes.filter((cause) => !locallyRemoved.has(cause.id))
    const archived = visible.filter((cause) => isCauseArchived(cause, library))
    const active = visible.filter((cause) => !isCauseArchived(cause, library))
    return {
      organizing: active.filter((cause) => isLive(cause) && cause.founderAddress?.toLowerCase() === addressLc),
      saved: active.filter((cause) => isLive(cause) && cause.founderAddress?.toLowerCase() !== addressLc),
      drafts: active.filter((cause) => !isLive(cause)),
      archived,
      active,
    }
  }, [addressLc, causes, library, locallyRemoved])

  const shown = useMemo(() => {
    const source = compact ? groups.active : view === 'recent' ? groups.active : groups[view]
    const needle = query.trim().toLowerCase()
    const filtered = needle
      ? source.filter((cause) => `${causeTitle(cause)} ${cause.summary ?? ''}`.toLowerCase().includes(needle))
      : source
    const sorted = [...filtered].sort((a, b) => {
      if (sort === 'alphabetical') return causeTitle(a).localeCompare(causeTitle(b))
      if (sort === 'newest') return b.createdAt.localeCompare(a.createdAt)
      return causeLastOpenedAt(b, library).localeCompare(causeLastOpenedAt(a, library))
    })
    return compact || view === 'recent' ? sorted.slice(0, compact ? 5 : RECENT_LIMIT) : sorted
  }, [compact, groups, library, query, sort, view])

  const hideRemovedBookmark = (cause: CauseDraft) => {
    if (!window.confirm(`Remove the bookmark for “${causeTitle(cause)}”?`)) return
    setLocallyRemoved((current) => new Set(current).add(cause.id))
    removeBookmark?.(cause)
  }

  const counts: Record<View, number> = {
    recent: Math.min(groups.active.length, RECENT_LIMIT),
    organizing: groups.organizing.length,
    saved: groups.saved.length,
    drafts: groups.drafts.length,
    archived: groups.archived.length,
  }

  return (
    <Stack spacing={compact ? 2 : 3} data-testid={testId}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Stack direction="row" alignItems="center" sx={{ minWidth: 0 }}>
          <Typography variant="h4" component={headingComponent} sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
            Cause boards
          </Typography>
          <HeaderInfoTip title="A published mix of independent statements, plus fundable projects aligned with them — not a club you join." label="About cause boards" />
        </Stack>
        <Button
          variant="outlined"
          data-testid="causes-start-cause"
          sx={{ minHeight: 40, px: 1.75, borderRadius: 999, textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, mt: 0.35 }}
          onClick={() => navigate(createCausePath())}
        >
          Start a cause board
        </Button>
      </Box>

      {loading && causes.length === 0 && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">Loading cause boards…</Typography>
        </Stack>
      )}

      {!loading && causes.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No cause boards on this device. Start one if you want a different combination of
          statements — reuse overlapping ones so you are not starting from zero. Or open
          a cause board from its organizer’s link; there is no directory.
        </Alert>
      )}

      {causes.length > 0 && compact && (
        <>
          <Stack spacing={0.75}>
            {shown.map((cause) => <CauseCard key={cause.id} cause={cause} />)}
          </Stack>
          {causes.length > shown.length && (
            <Button component={RouterLink} to="/causes" sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
              See all {causes.length} cause boards
            </Button>
          )}
        </>
      )}

      {causes.length > 0 && !compact && (
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              size="small"
              fullWidth
              label="Filter your cause boards"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
            />
            <TextField select size="small" label="Sort" value={sort} onChange={(event) => setSort(event.target.value as Sort)} sx={{ minWidth: { sm: 170 } }}>
              <MenuItem value="recent">Recently used</MenuItem>
              <MenuItem value="alphabetical">Alphabetical</MenuItem>
              <MenuItem value="newest">Newest</MenuItem>
            </TextField>
          </Stack>

          <Tabs value={view} onChange={(_, next: View) => setView(next)} variant="scrollable" scrollButtons="auto" aria-label="Cause board views">
            {(['recent', 'organizing', 'saved', 'drafts', 'archived'] as const).map((name) => (
              <Tab key={name} value={name} label={`${name[0].toUpperCase()}${name.slice(1)} ${counts[name]}`} sx={{ textTransform: 'none' }} />
            ))}
          </Tabs>

          {shown.length > 0 ? (
            <Stack spacing={0.75}>
              {shown.map((cause) => {
                const archived = isCauseArchived(cause, library)
                const organizer = isLive(cause) && cause.founderAddress?.toLowerCase() === addressLc
                const action = archived
                  ? { label: 'Restore from archive', onClick: () => setLibrary(setCauseArchived(cause, false)) }
                  : organizer
                    ? { label: 'Archive', onClick: () => setLibrary(setCauseArchived(cause, true)) }
                    : isLive(cause)
                      ? { label: 'Remove bookmark', onClick: () => hideRemovedBookmark(cause) }
                      : undefined
                return <CauseCard key={cause.id} cause={cause} action={action} />
              })}
            </Stack>
          ) : (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              {query ? 'No cause boards match that filter.' : `No ${view} cause boards.`}
            </Typography>
          )}
        </>
      )}

      {footer}
    </Stack>
  )
}
