import { Box, Typography, Paper } from '@mui/material'

export function BrowseStatementsPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Browse Statements
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Statement browsing and search functionality coming soon...
        </Typography>
      </Paper>
    </Box>
  )
}
