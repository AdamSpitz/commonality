import { Paper, Typography } from '@mui/material'

export function ConnectWalletPrompt() {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="body1" color="text.secondary">
        Connect your wallet to buy tokens.
      </Typography>
    </Paper>
  )
}
