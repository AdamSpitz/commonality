import { Button, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <Stack spacing={2} sx={{ py: 6, textAlign: 'center' }}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>
        Page not found
      </Typography>
      <Typography color="text.secondary">
        That route is not part of CauseStarter.
      </Typography>
      <Button
        component={RouterLink}
        to="/"
        variant="contained"
        sx={{ alignSelf: 'center', borderRadius: 999, textTransform: 'none', fontWeight: 700 }}
      >
        Go home
      </Button>
    </Stack>
  )
}
