import { Box, Typography, Paper } from '@mui/material'

export function SettingsPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1" paragraph>
          Configure your preferences
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Settings for trusted implication attesters and other preferences coming
          soon...
        </Typography>
      </Paper>
    </Box>
  )
}
