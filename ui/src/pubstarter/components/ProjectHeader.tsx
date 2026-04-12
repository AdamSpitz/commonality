import { Box, Typography, Paper, Chip, Stack, LinearProgress } from '@mui/material'
import type { Project } from '@commonality/sdk'
import { getProjectStatus, STATUS_COLORS, STATUS_LABELS, formatRelativeDeadline } from '../utils'
import { formatCurrencyRaised } from '../../shared/currency'

type ProjectMetadata = { name?: string; description?: string }

interface ProjectHeaderProps {
  project: Project
  metadata: ProjectMetadata | null
}

export function ProjectHeader({ project, metadata }: ProjectHeaderProps) {
  const status = getProjectStatus(project)
  const progressPercent = BigInt(project.threshold) > 0n
    ? Math.min(Number(BigInt(project.totalReceived) * 100n / BigInt(project.threshold)), 100)
    : 0

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            {metadata?.name || `Project ${project.id.slice(0, 10)}...`}
          </Typography>
          {metadata?.description && (
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              {metadata.description}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            Recipient: {project.recipient}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip
            label={STATUS_LABELS[status]}
            color={STATUS_COLORS[status]}
          />
          <Chip
            label={formatRelativeDeadline(project.deadline)}
            variant="outlined"
          />
        </Stack>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body1">
            {formatCurrencyRaised(project.totalReceived, project.threshold, project.fundingCurrency)}
          </Typography>
          <Typography variant="body1">
            {progressPercent}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progressPercent}
          sx={{ height: 10, borderRadius: 5 }}
        />
      </Box>
    </Paper>
  )
}
