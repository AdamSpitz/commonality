import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { YourCauses } from '../components/YourCauses'
import { useUserCauses } from '../hooks/useUserCauses'

export function CausesPage() {
  const { causes, loading, removeBookmark } = useUserCauses()
  return (
    <Stack spacing={2} data-testid="organize-workspace">
      <Box>
        <Typography
          variant="overline"
          sx={{ letterSpacing: '0.14em', fontWeight: 700, color: 'primary.main' }}
        >
          Organize
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 560 }}>
          Publish a useful mix of statements. A cause board is a selection,
          not a club people join.
        </Typography>
      </Box>
      <YourCauses causes={causes} loading={loading} removeBookmark={removeBookmark} />
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Want to create a project?</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1 }}>
          Publishing a piece of work lives in the Work workspace.
        </Typography>
        <Button component={RouterLink} to="/work" sx={{ px: 0 }}>Go to Work</Button>
      </Paper>
    </Stack>
  )
}
