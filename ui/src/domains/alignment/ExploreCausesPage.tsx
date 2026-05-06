import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

const starterCauses = [
  'Noninflammatory political content',
  'Common-sense-majority organizing',
  'Public-goods software infrastructure',
]

export function AlignmentExploreCausesPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Explore causes
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        This will become the purpose-specific explorer for active funding areas. For now, start from one of the obvious cause areas below or open a portal directly when you have a statement CID.
      </Typography>
      <Stack spacing={2}>
        {starterCauses.map((cause) => (
          <Paper key={cause} sx={{ p: 2 }}>
            <Typography variant="h6">{cause}</Typography>
            <Typography variant="body2" color="text.secondary">
              Cause portals are anchored to statements; once the statement exists, aligned projects can be attested and funded from its portal.
            </Typography>
          </Paper>
        ))}
        <Button component={RouterLink} to="/" variant="outlined" sx={{ alignSelf: 'flex-start' }}>
          Back to Alignment
        </Button>
      </Stack>
    </Box>
  )
}
