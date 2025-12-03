import { Box, Typography, Paper } from '@mui/material'
import { useParams } from 'react-router-dom'
import { useAccount } from 'wagmi'

export function UserProfilePage() {
  const { address } = useParams<{ address?: string }>()
  const { address: connectedAddress } = useAccount()

  const displayAddress = address || connectedAddress
  const isOwnProfile = !address || address === connectedAddress

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {isOwnProfile ? 'My Profile' : 'User Profile'}
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        {displayAddress ? (
          <>
            <Typography variant="body2" color="text.secondary" paragraph>
              Address: {displayAddress}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Signed statements and activity coming soon...
            </Typography>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Connect your wallet to view your profile.
          </Typography>
        )}
      </Paper>
    </Box>
  )
}
