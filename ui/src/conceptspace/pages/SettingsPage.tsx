import { Box, Typography, Alert } from '@mui/material'
import { DirectTrustSettingsSection } from '../components/DirectTrustSettingsSection'
import { LinkedSocialAccountsSection } from '../components/settings/LinkedSocialAccountsSection'
import { NudgerSettingsSection } from '../components/settings/NudgerSettingsSection'
import { SingleAccountAssertionSection } from '../components/settings/SingleAccountAssertionSection'
import { TrustedContentAttestersSection } from '../components/settings/TrustedContentAttestersSection'
import { TrustedStatementSourcesSection } from '../components/settings/TrustedStatementSourcesSection'

export function SettingsPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Trust Settings
      </Typography>

      <Alert severity="info" sx={{ mt: 2 }}>
        Most new users can ignore this page at first. It is for customizing whose
        attestations and trust relationships you want the app to rely on.
      </Alert>

      <LinkedSocialAccountsSection />
      <SingleAccountAssertionSection />
      <TrustedStatementSourcesSection />
      <TrustedContentAttestersSection />
      <NudgerSettingsSection />
      <DirectTrustSettingsSection />
    </Box>
  )
}
