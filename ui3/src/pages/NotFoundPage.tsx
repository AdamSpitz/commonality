import { Button, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <Stack spacing={2} sx={{ py: 4 }} data-testid="not-found-page">
      <Typography variant="h4" sx={{ fontWeight: 800 }}>
        Page not found
      </Typography>
      <Typography variant="body2" color="text.secondary">
        That route is not part of ui3. Try home, causes, aggregates, your member profile, or tools.
      </Typography>
      <Button
        component={RouterLink}
        to="/"
        variant="contained"
        sx={{ alignSelf: 'flex-start', borderRadius: 999, textTransform: 'none', fontWeight: 700 }}
      >
        Home
      </Button>
    </Stack>
  )
}
