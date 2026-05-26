import { Box, Paper, Stack, Typography } from '@mui/material'

export function DelegationSupportedSitesPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Sites that support delegation
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        LazyGiving, Alignment, and Content Funding can all route donations through delegates. On each supporting site, donations show up as “Alice Donor (delegated via Bob Delegate)”.
      </Typography>
      <Stack spacing={2}>
        {['LazyGiving', 'Alignment', 'Content Funding'].map((site) => (
          <Paper key={site} sx={{ p: 2 }}>
            <Typography variant="h6">{site}</Typography>
            <Typography variant="body2" color="text.secondary">
              Use the domain-specific funding flow, then choose a delegation note when you want someone else to make the allocation decision.
            </Typography>
          </Paper>
        ))}
      </Stack>
    </Box>
  )
}
