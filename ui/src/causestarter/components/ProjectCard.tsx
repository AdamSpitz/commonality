import { Box, Paper, Stack, Typography } from '@mui/material'
import {
  getProjectStatus,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_TOOLTIPS,
} from '@ui/lazy-giving'
import { InfoChip, projectPathForAddress } from '@ui/shared'
import { Link as RouterLink } from 'react-router-dom'
import type { ProjectRelation, UserProject } from '../lib/userProjects'

const RELATION_LABEL: Record<ProjectRelation, string> = {
  created: 'Owner',
  contributed: 'Contributed',
  bookmarked: 'Bookmarked',
}

const RELATION_TOOLTIP: Record<ProjectRelation, string> = {
  created: 'This wallet created the project.',
  contributed: 'This wallet contributed to this project.',
  bookmarked: 'You bookmarked this project.',
}

export function ProjectCard({ project, mode }: { project: UserProject; mode?: 'work' | 'fund' }) {
  const status = getProjectStatus(project.project)
  const path = projectPathForAddress(project.project.id)
  const to = mode ? `${path}?mode=${mode}` : path

  return (
    <Paper
      component={RouterLink}
      to={to}
      elevation={0}
      data-testid="home-project"
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
            {project.title}
          </Typography>
        </Box>
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.75}
          useFlexGap
          flexWrap="wrap"
          justifyContent="flex-end"
          sx={{ flexShrink: 0 }}
        >
          <InfoChip
            size="small"
            label={STATUS_LABELS[status]}
            color={STATUS_COLORS[status]}
            title={STATUS_TOOLTIPS[status]}
          />
          {project.relations.map((relation) => (
            <InfoChip
              key={relation}
              size="small"
              label={RELATION_LABEL[relation]}
              color="default"
              title={RELATION_TOOLTIP[relation]}
            />
          ))}
        </Stack>
      </Stack>
    </Paper>
  )
}
