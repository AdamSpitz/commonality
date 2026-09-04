import { Box, Stack, Typography } from '@mui/material'
import { YourDashboard } from '../components/YourDashboard'

export function PersonalDashboardPage() {
  return (
    <Stack spacing={2} data-testid="fund-workspace">
      <Box>
        <Typography
          variant="overline"
          sx={{ letterSpacing: '0.14em', fontWeight: 700, color: 'primary.main' }}
        >
          Fund
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 560 }}>
          Help proposed work reach its threshold. Your personal board uses the
          statements and filters you choose; signing a statement does not change it.
        </Typography>
      </Box>
      <YourDashboard layout="page" />
    </Stack>
  )
}
