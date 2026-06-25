import { useState } from 'react'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { Box, Typography, Paper, Chip, Stack, LinearProgress, IconButton, Tooltip, Link } from '@mui/material'
import type { Project } from '@commonality/sdk/lazy-giving'
import { getProjectStatus, STATUS_COLORS, STATUS_LABELS, formatRelativeDeadline } from '../utils'
import { truncateAddress } from '../../shared'
import { formatCurrencyRaised } from '../../shared'

type ProjectMetadata = { name?: string; description?: string; updatesUrl?: string }

interface ProjectHeaderProps {
  project: Project
  metadata: ProjectMetadata | null
}

export function ProjectHeader({ project, metadata }: ProjectHeaderProps) {
  const status = getProjectStatus(project)
  const [copiedRecipient, setCopiedRecipient] = useState(false)
  const hasMinimum = BigInt(project.threshold) > 0n
  const progressPercent = hasMinimum
    ? Math.min(Number(BigInt(project.totalReceived) * 100n / BigInt(project.threshold)), 100)
    : 0

  const copyRecipient = () => {
    void navigator.clipboard.writeText(project.recipient)
    setCopiedRecipient(true)
    window.setTimeout(() => setCopiedRecipient(false), 1500)
  }

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
          {metadata?.updatesUrl && (
            <Typography variant="body2" sx={{ mb: 1 }}>
              Progress updates:{' '}
              <Link href={metadata.updatesUrl} target="_blank" rel="noopener noreferrer">
                {metadata.updatesUrl}
              </Link>
            </Typography>
          )}
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Recipient: {truncateAddress(project.recipient)}
            </Typography>
            <Tooltip title={copiedRecipient ? 'Copied!' : project.recipient}>
              <IconButton size="small" onClick={copyRecipient} aria-label="Copy recipient address">
                <ContentCopyIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </Stack>
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
            {hasMinimum ? `${progressPercent}%` : 'No minimum'}
          </Typography>
        </Box>
        {hasMinimum && (
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{ height: 10, borderRadius: 5 }}
          />
        )}
      </Box>
    </Paper>
  )
}
