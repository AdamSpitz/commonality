import { Box, Stack, Typography } from '@mui/material'
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
          Publish a useful mix of statements and work. A cause board is a selection,
          not a club people join.
        </Typography>
      </Box>
      <YourCauses causes={causes} loading={loading} removeBookmark={removeBookmark} />
    </Stack>
  )
}
