import { Box, Typography, Paper } from '@mui/material'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { Button } from '@mui/material'

export function CauseLeaderboardPage() {
  const { statementCid } = useParams<{ statementCid: string }>()

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Button component={RouterLink} to={`/portal/${statementCid}`} size="small">
          ← Back to Funding Portal
        </Button>
      </Box>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Cause Leaderboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Leaderboard coming soon.
        </Typography>
      </Paper>
    </Box>
  )
}
