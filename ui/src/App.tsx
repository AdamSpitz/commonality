import { AppBar, Box, Container, Toolbar, Typography } from '@mui/material'
import { ConnectKitButton } from 'connectkit'
// Test SDK import
import { BeliefsAbi } from '@commonality/sdk'

function App() {
  // Verify SDK is accessible
  console.log('SDK loaded, BeliefsAbi:', BeliefsAbi ? 'available' : 'missing')
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Commonality
          </Typography>
          <ConnectKitButton />
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome to Commonality
        </Typography>
        <Typography variant="body1" paragraph>
          A coordination platform for aligned people to track their numbers and crowdfund projects.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Connect your wallet to get started.
        </Typography>
      </Container>
    </Box>
  )
}

export default App
