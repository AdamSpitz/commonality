import { Box, Typography } from '@mui/material'
import { DirectTrustSettingsSection } from '@ui/conceptspace/components/DirectTrustSettingsSection'

export function SettingsPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Trust settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Until you name someone yourself, project lists use CauseStarter's starter
        network to screen obvious spam. Naming anyone here replaces that default
        with your personal trust network. This does not attest to a cause; it only
        says whose project vouches you will count.
      </Typography>
      <DirectTrustSettingsSection
        emptyTrustMessage="No personal trust scores yet. CauseStarter's starter network is currently filtering project vouches for you."
        refreshingEmptyMessage="Refreshing your personal trust network. CauseStarter's starter network remains in use until you name someone yourself."
      />
    </Box>
  )
}
