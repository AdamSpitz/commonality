import { Box, Paper, Typography } from '@mui/material'
import { WalletButton } from '../../shared/components/WalletButton'

export function ConnectWalletPrompt() {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="body1" color="text.secondary">
        Connect your wallet to give to this project.
      </Typography>
      <Box sx={{ mt: 2 }}>
        <WalletButton />
      </Box>
    </Paper>
  )
}
