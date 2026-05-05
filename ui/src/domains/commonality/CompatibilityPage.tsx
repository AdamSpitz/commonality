import { Button, Paper, Stack, Typography } from '@mui/material'
import { useLocation } from 'react-router-dom'
import type { DomainId } from '../types'
import { getDomainUrl } from '../domainUrls'

interface CompatibilityPageProps {
  targetDomain: Extract<DomainId, 'pubstarter' | 'alignment' | 'delegation'>
  targetName: string
  fallbackPath: string
  workflowName: string
}

export function CompatibilityPage({ targetDomain, targetName, fallbackPath, workflowName }: CompatibilityPageProps) {
  const location = useLocation()
  const targetUrl = getDomainUrl(targetDomain, location.pathname + location.search + location.hash, {
    fallbackHref: getDomainUrl(targetDomain, fallbackPath, { fallbackHref: '#' }),
  })

  return (
    <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 4 }}>
      <Stack spacing={2}>
        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700 }}>
          This workflow moved
        </Typography>
        <Typography variant="h4" component="h1">
          {workflowName} now lives on {targetName}.
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720 }}>
          Commonality is now the movement and founder-facing site. The product workflow you opened has a focused home so its landing page and navigation can stay understandable on their own.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button component="a" href={targetUrl} variant="contained">
            Open {targetName}
          </Button>
          <Button component="a" href={getDomainUrl('commonality', '/', { fallbackHref: '/' })} variant="outlined">
            Back to Commonality
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
}
