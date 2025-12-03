import { Box, Typography, Paper } from '@mui/material'
import { useParams } from 'react-router-dom'

export function StatementPage() {
  const { statementId } = useParams<{ statementId: string }>()

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Statement
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body2" color="text.secondary" paragraph>
          Statement ID: {statementId}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Statement details coming soon...
        </Typography>
      </Paper>
    </Box>
  )
}
