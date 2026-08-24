import { Box, Paper, Stack, Typography } from '@mui/material'
import { InfoChip } from '@ui/shared'
import { Link as RouterLink } from 'react-router-dom'
import type { CauseDraft } from '../lib/causeStore'
import { causeEditPath, causePath, causeTitle, hasPublishedRoster, isLive, publishedPlanks, realPlanks } from '../lib/causeStore'

interface CauseCardProps {
  cause: CauseDraft
}

export function CauseCard({ cause }: CauseCardProps) {
  const planks = realPlanks(cause)
  const publishedCount = publishedPlanks(cause).length
  // An unpublished draft has nothing for a supporter to read yet, so open it
  // where its organizer can work on it.
  const to = hasPublishedRoster(cause) ? causePath(cause) : causeEditPath(cause)
  return (
    <Paper
      component={RouterLink}
      to={to}
      elevation={0}
      sx={{
        display: 'block',
        px: 1.5,
        py: 1,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        '&:active': { transform: 'scale(0.99)' },
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: (theme) => `0 4px 12px ${theme.palette.mode === 'light' ? 'rgba(15,118,110,0.10)' : 'rgba(0,0,0,0.28)'}`,
        },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {causeTitle(cause)}
          </Typography>
        </Box>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
          {planks.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              {planks.length} statement{planks.length === 1 ? '' : 's'}
              {publishedCount < planks.length && ` · ${publishedCount} published`}
            </Typography>
          )}
          {!isLive(cause) && (
            <InfoChip
              size="small"
              label="Nothing published yet"
              color="default"
              sx={{ flexShrink: 0 }}
              title="Only you can see this draft. Publish to get a shareable link."
            />
          )}
        </Stack>
      </Stack>
    </Paper>
  )
}
