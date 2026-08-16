import { Box, Chip, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import type { CauseDraft } from '../lib/causeStore'
import { causePath, causeTitle, isLive, publishedPlanks, realPlanks } from '../lib/causeStore'

interface CauseCardProps {
  cause: CauseDraft
}

export function CauseCard({ cause }: CauseCardProps) {
  const planks = realPlanks(cause)
  const publishedCount = publishedPlanks(cause).length
  const to = causePath(cause)
  return (
    <Paper
      component={RouterLink}
      to={to}
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
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
            {causeTitle(cause)}
          </Typography>
        </Box>
        {!isLive(cause) && (
          <Chip
            size="small"
            label="Nothing published yet"
            color="default"
            sx={{ flexShrink: 0 }}
          />
        )}
      </Stack>

      {planks.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
          {planks.length} statement{planks.length === 1 ? '' : 's'}
          {publishedCount < planks.length && ` · ${publishedCount} published`}
        </Typography>
      )}
    </Paper>
  )
}
