import {
  Box,
  CircularProgress,
  Link as MuiLink,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { Link as RouterLink } from 'react-router-dom'
import type { SupportingTool } from '../lib/tools'
import { isInternalTool, toolHref } from '../lib/tools'
import { useToolExamples } from '../hooks/useToolExamples'

interface ToolCardProps {
  tool: SupportingTool
  compact?: boolean
  /** When true (default), load and show up to 2 live examples from the tool domain. */
  showExamples?: boolean
}

export function ToolCard({ tool, compact = false, showExamples = true }: ToolCardProps) {
  const { examples, loading } = useToolExamples(tool)
  const shouldShowExamples = showExamples && tool.kind !== 'thesis'
  const internal = isInternalTool(tool)
  const href = toolHref(tool)

  return (
    <Paper
      elevation={0}
      sx={{
        p: compact ? 2 : 2.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        height: '100%',
        transition: 'border-color 0.15s',
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      <Stack spacing={1.25} sx={{ height: '100%' }}>
        <Stack
          component={internal ? RouterLink : 'a'}
          to={internal ? href : undefined}
          href={internal ? undefined : href}
          target={internal ? undefined : '_blank'}
          rel={internal ? undefined : 'noreferrer'}
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={1}
          sx={{ textDecoration: 'none', color: 'inherit' }}
        >
          <Box>
            <Typography variant={compact ? 'subtitle1' : 'h6'} sx={{ fontWeight: 700 }}>
              {tool.name}
            </Typography>
            <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
              {tool.role}
            </Typography>
          </Box>
          {!internal && (
            <OpenInNewIcon fontSize="small" sx={{ color: 'text.secondary', mt: 0.5 }} />
          )}
        </Stack>

        <Typography variant="body2" color="text.secondary">
          {tool.description}
        </Typography>

        {shouldShowExamples && (
          <Box
            sx={{
              mt: 0.5,
              pt: 1.25,
              borderTop: '1px dashed',
              borderColor: 'divider',
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}
            >
              Live examples
            </Typography>

            {loading && examples.length === 0 && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <CircularProgress size={14} />
                <Typography variant="caption" color="text.secondary">
                  Looking for examples…
                </Typography>
              </Stack>
            )}

            {!loading && examples.length === 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                No live examples yet on this network.
              </Typography>
            )}

            {examples.length > 0 && (
              <Stack spacing={0.75} sx={{ mt: 0.75 }}>
                {examples.map((example) => (
                  <Box
                    key={`${example.label}-${example.href ?? ''}`}
                    sx={{
                      px: 1.25,
                      py: 0.85,
                      borderRadius: 2,
                      bgcolor: 'action.hover',
                    }}
                  >
                    {example.href && example.href !== '#' ? (
                      <MuiLink
                        component={example.href.startsWith('/') ? RouterLink : 'a'}
                        to={example.href.startsWith('/') ? example.href : undefined}
                        href={example.href.startsWith('/') ? undefined : example.href}
                        target={example.href.startsWith('/') ? undefined : '_blank'}
                        rel={example.href.startsWith('/') ? undefined : 'noreferrer'}
                        underline="hover"
                        variant="body2"
                        sx={{ fontWeight: 600, display: 'block', color: 'text.primary' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {example.label}
                      </MuiLink>
                    ) : (
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {example.label}
                      </Typography>
                    )}
                    {example.detail && (
                      <Typography variant="caption" color="text.secondary">
                        {example.detail}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        )}
      </Stack>
    </Paper>
  )
}
