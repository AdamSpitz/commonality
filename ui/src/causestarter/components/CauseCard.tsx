import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import { Box, IconButton, Menu, MenuItem, Paper, Stack, Typography } from '@mui/material'
import { useState, type MouseEvent } from 'react'
import { InfoChip } from '@ui/shared'
import { Link as RouterLink } from 'react-router-dom'
import type { CauseDraft } from '../lib/causeStore'
import { causeEditPath, causePath, causeTitle, hasPublishedRoster, isLive, publishedPlanks, realPlanks } from '../lib/causeStore'
import { rememberCauseOpened } from '../lib/causeLibrary'

interface CauseCardProps {
  cause: CauseDraft
  action?: { label: string; onClick: () => void }
}

export function CauseCard({ cause, action }: CauseCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const planks = realPlanks(cause)
  const publishedCount = publishedPlanks(cause).length
  // An unpublished draft has nothing for a supporter to read yet, so open it
  // where its organizer can work on it.
  const to = hasPublishedRoster(cause) ? causePath(cause) : causeEditPath(cause)
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        '&:active': { transform: 'scale(0.99)' },
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: (theme) => `0 4px 12px ${theme.palette.mode === 'light' ? 'rgba(15,118,110,0.10)' : 'rgba(0,0,0,0.28)'}`,
        },
      }}
    >
      <Stack direction="row" alignItems="center">
        <Box
          component={RouterLink}
          to={to}
          onClick={() => rememberCauseOpened(cause)}
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, minWidth: 0, flexGrow: 1, px: 1.5, py: 1, textDecoration: 'none', color: 'inherit' }}
        >
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
        </Box>
        {action && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
            <>
              <IconButton
                size="small"
                aria-label={`Actions for ${causeTitle(cause)}`}
                onClick={(event: MouseEvent<HTMLElement>) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setMenuAnchor(event.currentTarget)
                }}
              >
                <MoreHorizIcon fontSize="small" />
              </IconButton>
              <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                }}
              >
                <MenuItem onClick={() => { setMenuAnchor(null); action.onClick() }}>
                  {action.label}
                </MenuItem>
              </Menu>
            </>
        </Stack>
        )}
      </Stack>
    </Paper>
  )
}
