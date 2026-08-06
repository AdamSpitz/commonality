import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { CauseCard } from '../components/CauseCard'
import { listCauses } from '../lib/causeStore'

export function MomentumPage() {
  const causes = listCauses()
  const drafts = causes.filter((c) => c.status === 'draft')
  const launched = causes.filter((c) => c.status === 'launched')

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
          Momentum
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          Track the causes you are building. Open one to grow support and take the next step.
        </Typography>
      </Box>

      {causes.length === 0 && (
        <Alert
          severity="info"
          sx={{ borderRadius: 2 }}
          action={
            <Button component={RouterLink} to="/start" color="inherit" size="small" sx={{ textTransform: 'none' }}>
              Start
            </Button>
          }
        >
          No causes yet. Start one to begin building momentum.
        </Alert>
      )}

      {launched.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.25 }}>
            Live causes
          </Typography>
          <Stack spacing={1.5}>
            {launched.map((cause) => (
              <CauseCard key={cause.id} cause={cause} />
            ))}
          </Stack>
        </Box>
      )}

      {drafts.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.25 }}>
            Drafts
          </Typography>
          <Stack spacing={1.5}>
            {drafts.map((cause) => (
              <CauseCard key={cause.id} cause={cause} />
            ))}
          </Stack>
        </Box>
      )}

      <Button
        component={RouterLink}
        to="/start"
        variant="contained"
        size="large"
        fullWidth
        sx={{ minHeight: 48, borderRadius: 999, textTransform: 'none', fontWeight: 700 }}
      >
        Start another cause
      </Button>
    </Stack>
  )
}
