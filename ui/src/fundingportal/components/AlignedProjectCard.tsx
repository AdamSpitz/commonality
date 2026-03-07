import {
  Card,
  CardActionArea,
  CardContent,
  Box,
  Typography,
  Chip,
  Stack,
  LinearProgress,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { formatEther } from 'viem'
import {
  getProjectStatus,
  STATUS_COLORS,
  STATUS_LABELS,
  formatRelativeDeadline,
} from '../../pubstarter/utils'

export type AlignedProject = {
  projectAddress: string
  alignmentType: 'direct' | 'indirect'
  totalReceived: string
  threshold: string
  deadline: string
}

export type ProjectMetadata = { name?: string; description?: string }

export function AlignedProjectCard({
  project,
  metadata,
}: {
  project: AlignedProject
  metadata: ProjectMetadata | undefined
}) {
  const status = getProjectStatus(project)
  const fundingProgress =
    BigInt(project.threshold) > 0n
      ? Number((BigInt(project.totalReceived) * 10000n) / BigInt(project.threshold)) / 100
      : 0
  const progressPercent = Math.min(fundingProgress, 100)

  return (
    <Card>
      <CardActionArea component={RouterLink} to={`/projects/${project.projectAddress}`}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
              {metadata?.name || `Project ${project.projectAddress.slice(0, 8)}...`}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ ml: 1 }}>
              <Chip
                label={project.alignmentType === 'direct' ? 'Direct' : 'Indirect'}
                size="small"
                variant="outlined"
                color={project.alignmentType === 'direct' ? 'primary' : 'default'}
              />
              <Chip label={STATUS_LABELS[status]} color={STATUS_COLORS[status]} size="small" />
              <Chip label={formatRelativeDeadline(project.deadline)} size="small" variant="outlined" />
            </Stack>
          </Box>

          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {formatEther(BigInt(project.totalReceived))} / {formatEther(BigInt(project.threshold))} ETH
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(fundingProgress)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progressPercent}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
