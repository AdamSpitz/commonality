import { useState } from 'react'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { Box, Typography, Paper, Stack, LinearProgress, IconButton, Tooltip, Link } from '@mui/material'
import type { Project } from '@commonality/sdk/lazy-giving'
import {
  getProjectStatus,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_TOOLTIPS,
  DEADLINE_ENDED_TOOLTIP,
  DEADLINE_OPEN_TOOLTIP,
  formatRelativeDeadline,
} from '../utils'
import { truncateAddress, formatCurrencyRaised, InfoChip, InfoLabel } from '../../shared'

type ProjectMetadata = { name?: string; description?: string; updatesUrl?: string }

interface ProjectHeaderProps {
  project: Project
  metadata: ProjectMetadata | null
  /** Page kind for the overline. Content-funding creator contracts use `content-project`. */
  kind?: 'project' | 'content-project'
}

export function ProjectHeader({ project, metadata, kind = 'project' }: ProjectHeaderProps) {
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

  const deadlineLabel = formatRelativeDeadline(project.deadline)
  const deadlineEnded = deadlineLabel === 'Ended'

  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="overline"
        sx={{ letterSpacing: '0.14em', fontWeight: 700, color: 'primary.main', display: 'block', mb: 0.5 }}
      >
        {kind === 'content-project' ? 'Content project' : 'Project'}
      </Typography>
      <Paper sx={{ p: 3 }}>
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
          <InfoChip
            title={STATUS_TOOLTIPS[status]}
            label={STATUS_LABELS[status]}
            color={STATUS_COLORS[status]}
          />
          <InfoChip
            title={deadlineEnded ? DEADLINE_ENDED_TOOLTIP : DEADLINE_OPEN_TOOLTIP}
            label={deadlineLabel}
            variant="outlined"
          />
        </Stack>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body1">
            {formatCurrencyRaised(project.totalReceived, project.threshold, project.fundingCurrency)}
          </Typography>
          {hasMinimum ? (
            <Typography variant="body1">{progressPercent}%</Typography>
          ) : (
            <InfoLabel title="This project has no funding minimum. The recipient can withdraw whenever the deadline allows, even if little or nothing has been raised.">
              <Typography variant="body1" component="span">No minimum</Typography>
            </InfoLabel>
          )}
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
    </Box>
  )
}
