import { Box, Chip, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { useState } from 'react'
import type { CauseStatement } from '../lib/causeStore'

type ViewMode = 'any' | 'all'

export function CauseViewPreview({ description, planks }: {
  description: string
  planks: CauseStatement[]
}) {
  const [mode, setMode] = useState<ViewMode>('any')

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 3 }} data-testid="cause-view-preview">
      <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Typography variant="overline" sx={{ opacity: 0.8 }}>Preview of your cause page</Typography>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>{description.trim() || 'Your cause'}</Typography>
      </Box>
      <Stack spacing={2} sx={{ p: { xs: 2, sm: 3 } }}>
        <ToggleButtonGroup
          exclusive
          fullWidth
          value={mode}
          onChange={(_, next: ViewMode | null) => next && setMode(next)}
          aria-label="Cause supporter view"
        >
          <ToggleButton value="any">At least one</ToggleButton>
          <ToggleButton value="all">All selected</ToggleButton>
        </ToggleButtonGroup>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {mode === 'any' ? 'People supporting at least one issue' : 'People supporting every selected issue'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {mode === 'any'
              ? 'This view brings together everyone who signs any selected plank.'
              : 'This view will show people who signed every plank, plus people who signed some and disagreed with none.'}
          </Typography>
        </Box>
        <Stack spacing={1}>
          {planks.map((plank) => (
            <Paper key={plank.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Chip size="small" label="0 supporters" variant="outlined" />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{plank.text}</Typography>
              </Stack>
            </Paper>
          ))}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Counts appear after launch. Visitors will be able to switch views and choose which issues to include.
        </Typography>
      </Stack>
    </Paper>
  )
}
