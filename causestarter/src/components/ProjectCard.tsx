import { Paper, Stack, Typography } from '@mui/material'
import { InfoChip, projectPathForAddress } from '@ui/shared'
import { Link as RouterLink } from 'react-router-dom'
import type { ProjectRelation, UserProject } from '../lib/userProjects'

const RELATION_LABEL: Record<ProjectRelation, string> = {
  created: 'Created',
  contributed: 'Contributed',
  bookmarked: 'Bookmarked',
}

export function ProjectCard({ project }: { project: UserProject }) {
  return (
    <Paper
      component={RouterLink}
      to={projectPathForAddress(project.project.id)}
      elevation={0}
      data-testid="home-project"
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
      <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
        {project.title}
      </Typography>
      {project.relations.length > 0 && (
        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }}>
          {project.relations.map((relation) => (
            <InfoChip
              key={relation}
              size="small"
              label={RELATION_LABEL[relation]}
              color="default"
              title={RELATION_LABEL[relation]}
            />
          ))}
        </Stack>
      )}
    </Paper>
  )
}
