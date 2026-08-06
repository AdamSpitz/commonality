import { useMemo } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { SupportButton } from '../components/SupportButton'
import { ToolCard } from '../components/ToolCard'
import {
  LEVER_LABELS,
  adoptedStatements,
  deleteCause,
  getCause,
  type MomentumLever,
} from '../lib/causeStore'
import { toolsForLevers } from '../lib/tools'
import type { IpfsCidV1 } from '@commonality/sdk/utils'

const nextActions: Record<MomentumLever, { title: string; body: string }> = {
  supporters: {
    title: 'Grow supporters',
    body: 'Share the goal and supporting statements. Every public signature is proof the cause is real.',
  },
  volunteers: {
    title: 'Recruit volunteers',
    body: 'Ask for specific help: outreach, research, event setup.',
  },
  collaborators: {
    title: 'Find collaborators',
    body: 'Invite peers to co-own strategy or run sibling projects.',
  },
  funding: {
    title: 'Open funding',
    body: 'Launch an assurance contract or stand up a cause board so money follows the commitment.',
  },
  content: {
    title: 'Back aligned media',
    body: 'Fund creators and channels that move people toward the goal.',
  },
}

export function CauseDetailPage() {
  const { causeId } = useParams<{ causeId: string }>()
  const navigate = useNavigate()
  const cause = causeId ? getCause(causeId) : undefined
  const tools = useMemo(
    () => (cause ? toolsForLevers(cause.levers) : []),
    [cause],
  )
  const adopted = cause ? adoptedStatements(cause) : []

  if (!cause) {
    return (
      <Stack spacing={2}>
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Cause not found on this device.
        </Alert>
        <Button component={RouterLink} to="/momentum" sx={{ textTransform: 'none' }}>
          Back to momentum
        </Button>
      </Stack>
    )
  }

  const handleDelete = () => {
    if (!window.confirm('Remove this cause from this device? On-chain data is unaffected.')) return
    deleteCause(cause.id)
    navigate('/momentum')
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
          <Chip
            size="small"
            label={cause.status === 'launched' ? 'Launched' : 'Draft'}
            color={cause.status === 'launched' ? 'success' : 'default'}
          />
        </Stack>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.55rem', sm: '1.9rem' } }}>
          {cause.name || 'Untitled cause'}
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Goal
        </Typography>
        <Typography variant="body1" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
          {cause.goal || 'No goal yet.'}
        </Typography>
        {cause.statementCid ? (
          <Box sx={{ mt: 2 }}>
            <Button
              component={RouterLink}
              to={`/statement/${cause.statementCid}`}
              size="small"
              sx={{ textTransform: 'none', mb: 2 }}
            >
              View published goal
            </Button>
            <SupportButton statementCid={cause.statementCid as IpfsCidV1} />
          </Box>
        ) : (
          <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
            Still a draft. Publish so others can stand with you.
            <Button
              component={RouterLink}
              to={`/start?id=${cause.id}`}
              size="small"
              sx={{ display: 'block', mt: 1, textTransform: 'none' }}
            >
              Continue setup
            </Button>
          </Alert>
        )}
      </Paper>

      {adopted.length > 0 && (
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Supporting statements
          </Typography>
          <Stack spacing={1.25}>
            {adopted.map((s, index) => (
              <Box key={s.id}>
                <Typography variant="body2">{s.text}</Typography>
                {cause.statementCids?.[index] && (
                  <Button
                    component={RouterLink}
                    to={`/statement/${cause.statementCids[index]}`}
                    size="small"
                    sx={{ textTransform: 'none', mt: 0.5 }}
                  >
                    View
                  </Button>
                )}
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.25 }}>
          Next momentum moves
        </Typography>
        <Stack spacing={1.25}>
          {cause.levers.map((lever) => (
            <Paper
              key={lever}
              elevation={0}
              sx={{ p: 2, borderRadius: 2.5, border: '1px solid', borderColor: 'divider' }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <Chip size="small" label={LEVER_LABELS[lever].label} color="primary" variant="outlined" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {nextActions[lever].title}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {nextActions[lever].body}
              </Typography>
            </Paper>
          ))}
        </Stack>
      </Box>

      {tools.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.25 }}>
            Tools for this cause
          </Typography>
          <Stack spacing={1.25}>
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} compact />
            ))}
          </Stack>
        </Box>
      )}

      <Divider />

      <Stack direction="row" spacing={1}>
        <Button
          component={RouterLink}
          to={`/start?id=${cause.id}`}
          variant="outlined"
          sx={{ textTransform: 'none', borderRadius: 999 }}
        >
          Edit
        </Button>
        <Button color="error" onClick={handleDelete} sx={{ textTransform: 'none' }}>
          Remove locally
        </Button>
      </Stack>
    </Stack>
  )
}
