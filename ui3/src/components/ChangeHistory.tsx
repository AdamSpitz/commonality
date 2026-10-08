import { useState } from 'react'
import {
  Box,
  Button,
  Chip,
  Collapse,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import type { CauseChangeEvent, StatementVersion } from '../lib/causeModel'

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

interface StatementHistoryProps {
  versions: StatementVersion[]
  /** Compact toggle for embedding under a statement row. */
  defaultOpen?: boolean
  /**
   * Restore an older version into the editor tip (new history entry).
   * Not shown for the current tip (index 0 when ordered newest-first).
   */
  onRestore?: (version: StatementVersion) => void
  /** When true, Restore buttons are available. */
  canRestore?: boolean
}

export function StatementHistory({
  versions,
  defaultOpen = false,
  onRestore,
  canRestore = false,
}: StatementHistoryProps) {
  const [open, setOpen] = useState(defaultOpen)
  const ordered = [...versions].reverse()

  if (versions.length === 0) return null

  return (
    <Box data-testid="statement-history">
      <Button
        size="small"
        onClick={() => setOpen((v) => !v)}
        endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        sx={{ textTransform: 'none', fontWeight: 600, px: 0 }}
      >
        {versions.length} version{versions.length === 1 ? '' : 's'}
      </Button>
      <Collapse in={open}>
        <Stack spacing={1} sx={{ mt: 0.75 }}>
          {ordered.map((v, index) => (
            <Paper
              key={v.id}
              elevation={0}
              sx={{
                p: 1.25,
                borderRadius: 2,
                border: '1px solid',
                borderColor: index === 0 ? 'primary.light' : 'divider',
                bgcolor: index === 0 ? 'action.hover' : 'transparent',
              }}
            >
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }} alignItems="center">
                {index === 0 && <Chip size="small" label="Current" color="primary" />}
                {v.cid ? (
                  <Chip size="small" label="Published" color="success" variant="outlined" />
                ) : (
                  <Chip size="small" label="Draft" variant="outlined" />
                )}
                {v.note && <Chip size="small" label={v.note} variant="outlined" />}
                {canRestore && index > 0 && onRestore && (
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => onRestore(v)}
                    sx={{ textTransform: 'none', fontWeight: 700, ml: 'auto' }}
                    data-testid="restore-version"
                  >
                    Restore
                  </Button>
                )}
              </Stack>
              <Typography variant="body2" sx={{ fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                {v.text}
              </Typography>
              {v.rationale && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Rationale: {v.rationale}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                {formatWhen(v.at)}
                {v.cid ? ` · ${v.cid.slice(0, 18)}…` : ''}
              </Typography>
              {v.cid && index > 0 && (
                <Typography variant="caption" color="text.secondary" display="block">
                  Still supportable on-chain (previous wording).
                </Typography>
              )}
            </Paper>
          ))}
        </Stack>
      </Collapse>
    </Box>
  )
}

interface CauseHistoryProps {
  events: CauseChangeEvent[]
  defaultOpen?: boolean
}

export function CauseHistory({ events, defaultOpen = false }: CauseHistoryProps) {
  const [open, setOpen] = useState(defaultOpen)
  const ordered = [...events].reverse()

  return (
    <Paper
      elevation={0}
      sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
      data-testid="cause-history"
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Cause change history
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {events.length} event{events.length === 1 ? '' : 's'} for this cause
          </Typography>
        </Box>
        <Button
          size="small"
          onClick={() => setOpen((v) => !v)}
          endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          {open ? 'Hide' : 'Show'}
        </Button>
      </Stack>
      <Collapse in={open}>
        {ordered.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            No changes recorded yet.
          </Typography>
        ) : (
          <Stack spacing={1} sx={{ mt: 1.5 }}>
            {ordered.map((e) => (
              <Box
                key={e.id}
                sx={{
                  pl: 1.25,
                  borderLeft: '3px solid',
                  borderColor: 'divider',
                  py: 0.5,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {formatWhen(e.at)} · {e.kind.replace(/_/g, ' ')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {e.label}
                </Typography>
                {(e.before || e.after) && e.kind !== 'goal_published' && e.kind !== 'belief_published' && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                    {e.before != null && e.after != null && e.before !== e.after
                      ? `“${e.before.slice(0, 60)}${e.before.length > 60 ? '…' : ''}” → “${e.after.slice(0, 60)}${e.after.length > 60 ? '…' : ''}”`
                      : null}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </Collapse>
    </Paper>
  )
}
