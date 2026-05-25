import { Box, Button, Paper, Typography } from '@mui/material'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'

export function CrossDomainUnavailablePage() {
  const [params] = useSearchParams()
  const domain = params.get('domain')
  const path = params.get('path') ?? '/'

  return (
    <Box sx={{ py: 4 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Site not available
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          This link points to{domain ? <> the <strong>{domain}</strong> site</> : ' a separate site'}, which
          isn&apos;t configured in this environment.
        </Typography>
        {domain && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontFamily: 'monospace' }}>
            {`VITE_${domain.toUpperCase().replace(/-/g, '_')}_URL`} is not set
            {path !== '/' ? ` (path: ${path})` : ''}
          </Typography>
        )}
        <Button component={RouterLink} to="/" variant="contained">
          Go home
        </Button>
      </Paper>
    </Box>
  )
}
