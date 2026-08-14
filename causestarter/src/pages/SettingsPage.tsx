import { Box, Typography } from '@mui/material'
import { DirectTrustSettingsSection } from '@ui/conceptspace/components/DirectTrustSettingsSection'

export function SettingsPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Trust settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Project lists on a cause only include vouches from wallets in your
        trust network. Name at least one person whose project-alignment vouches
        you accept. This does not attest to a cause; it only says whose vouches
        you will count.
      </Typography>
      <DirectTrustSettingsSection />
    </Box>
  )
}
