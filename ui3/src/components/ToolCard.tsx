import { Box, Paper, Stack, Typography } from '@mui/material'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import type { OnlineTool } from '../lib/tools'
import { toolHref } from '../lib/tools'

interface ToolCardProps {
  tool: OnlineTool
}

export function ToolCard({ tool }: ToolCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.25,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'border-color 0.15s',
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      <Stack
        component="a"
        href={toolHref(tool)}
        target="_blank"
        rel="noreferrer"
        spacing={1}
        sx={{ textDecoration: 'none', color: 'inherit' }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
              {tool.name}
            </Typography>
            <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
              {tool.role}
            </Typography>
          </Box>
          <OpenInNewIcon fontSize="small" sx={{ color: 'text.secondary', mt: 0.5 }} />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {tool.description}
        </Typography>
      </Stack>
    </Paper>
  )
}
