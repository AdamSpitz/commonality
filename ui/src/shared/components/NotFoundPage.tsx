import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { getDomainUrl } from '../routing/domainUrls'

export function NotFoundPage() {
  return (
    <Box sx={{ py: 4 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Page not found
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          We couldn&apos;t find a page at this URL. The link may be outdated or mistyped.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
          <Button component={RouterLink} to="/" variant="contained">
            Go home
          </Button>
          <Button component="a" href={getDomainUrl('tally', '/statements', { fallbackHref: '#' })} variant="outlined">
            Browse statements on Tally
          </Button>
          <Button component={RouterLink} to="/content" variant="outlined">
            Browse creators
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}
