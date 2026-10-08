import { Button, Chip, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import type { CauseRecord } from '../lib/causeModel'
import { primaryGoal } from '../lib/causeModel'

interface CauseCardProps {
  cause: CauseRecord
  onDelete?: () => void
}

export function CauseCard({ cause, onDelete }: CauseCardProps) {
  const goal = primaryGoal(cause)

  return (
    <Paper
      elevation={0}
      data-testid="cause-card"
      sx={{
        p: 2.25,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'border-color 0.15s',
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Typography
            component={RouterLink}
            to={`/cause/${cause.id}`}
            variant="subtitle1"
            sx={{ fontWeight: 700, textDecoration: 'none', color: 'inherit', flex: 1 }}
          >
            {cause.title}
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
            <Chip size="small" label={`${cause.founders.length} founder${cause.founders.length === 1 ? '' : 's'}`} />
            <Chip size="small" label={`${cause.beliefs.length} belief${cause.beliefs.length === 1 ? '' : 's'}`} variant="outlined" />
            <Chip size="small" label={`${cause.timeline.length} milestone${cause.timeline.length === 1 ? '' : 's'}`} variant="outlined" />
            {onDelete && (
              <Button
                size="small"
                color="error"
                variant="text"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onDelete()
                }}
                sx={{ textTransform: 'none', fontWeight: 600, minWidth: 0 }}
                data-testid="cause-card-delete"
              >
                Delete
              </Button>
            )}
          </Stack>
        </Stack>
        <Stack
          component={RouterLink}
          to={`/cause/${cause.id}`}
          spacing={1}
          sx={{ textDecoration: 'none', color: 'inherit' }}
        >
          {cause.summary && (
            <Typography variant="body2" color="text.secondary">{cause.summary}</Typography>
          )}
          {goal?.text && (
            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
              Goal: {goal.text}
            </Typography>
          )}
          {cause.projects.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              {cause.projects.length} project{cause.projects.length === 1 ? '' : 's'}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Paper>
  )
}
