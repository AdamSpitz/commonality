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
          Help proposed work reach its threshold. This list is the union of projects
          vouched as advancing statements you have signed — not a private cause.
        </Typography>
      </Box>
      <YourDashboard layout="page" />
    </Stack>
  )
}
