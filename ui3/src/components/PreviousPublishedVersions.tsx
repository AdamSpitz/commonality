import { useState } from 'react'
import {
  Box,
  Button,
  Chip,
  Collapse,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import type { StatementSupportTarget } from '../lib/causeModel'
import { SupportButton } from './SupportButton'
import type { IpfsCidV1 } from '@commonality/sdk/utils'

interface PreviousPublishedVersionsProps {
  targets: StatementSupportTarget[]
  /** goal | belief — labels Support button. */
  subject?: 'goal' | 'belief'
  defaultOpen?: boolean
}

/**
 * Older published CIDs for a goal/belief — still supportable on-chain after revise.
 */
export function PreviousPublishedVersions({
  targets,
  subject = 'goal',
  defaultOpen = false,
}: PreviousPublishedVersionsProps) {
  const previous = targets.filter((t) => !t.isCurrent)
  const [open, setOpen] = useState(defaultOpen)

  if (previous.length === 0) return null

  return (
    <Box data-testid="previous-published-versions">
      <Button
        size="small"
        onClick={() => setOpen((v) => !v)}
        endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        sx={{ textTransform: 'none', fontWeight: 600, px: 0 }}
      >
        {previous.length} previous published wording{previous.length === 1 ? '' : 's'}
      </Button>
      <Collapse in={open}>
        <Stack spacing={1.25} sx={{ mt: 0.75 }}>
          <Typography variant="caption" color="text.secondary">
            These older CIDs stay on-chain. You can still support them after a revise.
          </Typography>
          {previous.map((t) => (
            <Paper
              key={t.cid}
              elevation={0}
              sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
              data-testid={`previous-${subject}-version`}
            >
              <Stack direction="row" spacing={0.75} sx={{ mb: 0.5 }}>
                <Chip size="small" label="Previous" variant="outlined" />
                <Chip size="small" label="Published" color="success" variant="outlined" />
              </Stack>
              <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'pre-wrap' }}>
                {t.text}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', my: 0.75, wordBreak: 'break-all' }}>
                {t.cid}
              </Typography>
              <SupportButton
                statementCid={t.cid as IpfsCidV1}
                subject={subject}
                label={`Support this previous ${subject}`}
              />
            </Paper>
          ))}
        </Stack>
      </Collapse>
    </Box>
  )
}
