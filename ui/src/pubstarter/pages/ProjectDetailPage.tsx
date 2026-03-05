import { Box, Typography } from '@mui/material'
import { useParams } from 'react-router-dom'

export function ProjectDetailPage() {
  const { projectAddress } = useParams<{ projectAddress: string }>()

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Project Detail
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Project: {projectAddress}
      </Typography>
    </Box>
  )
}
