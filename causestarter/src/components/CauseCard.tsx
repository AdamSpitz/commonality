import { Box, Chip, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import type { CauseDraft } from '../lib/causeStore'
import { LEVER_LABELS, adoptedStatements } from '../lib/causeStore'

interface CauseCardProps {
  cause: CauseDraft
}

export function CauseCard({ cause }: CauseCardProps) {
  const adopted = adoptedStatements(cause)
  return (
    <Paper
      component={RouterLink}
      to={`/cause/${cause.id}`}
      elevation={0}
      sx={{
        display: 'block',
        p: 2.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        '&:active': { transform: 'scale(0.99)' },
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: (theme) => `0 8px 24px ${theme.palette.mode === 'light' ? 'rgba(15,118,110,0.12)' : 'rgba(0,0,0,0.35)'}`,
        },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
            {cause.status === 'launched' ? 'Live cause' : 'Draft'}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
            {cause.name || 'Untitled cause'}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={cause.status === 'launched' ? 'Launched' : 'Draft'}
          color={cause.status === 'launched' ? 'success' : 'default'}
          sx={{ flexShrink: 0 }}
        />
      </Stack>

      {cause.goal && (
        <Typography
          variant="body2"
          sx={{
            mt: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {cause.goal}
        </Typography>
      )}

      {adopted.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {adopted.length} supporting statement{adopted.length === 1 ? '' : 's'}
        </Typography>
      )}

      {cause.levers.length > 0 && (
        <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 2 }}>
          {cause.levers.map((lever) => (
            <Chip key={lever} size="small" variant="outlined" label={LEVER_LABELS[lever].label} />
          ))}
        </Stack>
      )}
    </Paper>
  )
}
