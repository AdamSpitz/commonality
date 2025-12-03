import { Box, Typography, Paper } from '@mui/material'

export function HomePage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome to Commonality
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1" paragraph>
          A coordination platform for aligned people to track their numbers and
          crowdfund projects.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Connect your wallet to get started. Browse statements, express your
          beliefs, and discover projects aligned with your values.
        </Typography>
      </Paper>
    </Box>
  )
}
