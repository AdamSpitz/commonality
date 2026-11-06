import { Box, Button, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useWorkRequests } from '../hooks/useWorkRequests'

export function WorkRequestsPage() {
  const { board, loading, error } = useWorkRequests()
  const requests = (board?.requests ?? []).filter((request) => request.current)

  return (
    <Stack spacing={2} data-testid="work-requests">
      <Box>
        <Typography variant="overline" sx={{ letterSpacing: '0.14em', fontWeight: 700, color: 'primary.main' }}>
          Requests for work
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 640 }}>
          Say what outcome you want before a provider exists. A funding offer is an intention with an expiry.
          It is not a payment, and note backing can still be spent or withdrawn.
        </Typography>
      </Box>
      <Button component={RouterLink} to="/work/requests/new" variant="contained" sx={{ alignSelf: 'flex-start' }}>
        Publish a request
      </Button>
      {loading && <Typography variant="body2">Loading requests…</Typography>}
      {error && <Typography color="error">{error}</Typography>}
      {!loading && requests.length === 0 && (
        <Typography variant="body2" color="text.secondary">No requests for work yet.</Typography>
      )}
      {requests.map((request) => (
        <Box key={`${request.actor}:${request.slug}`}>
          <Button
            component={RouterLink}
            to={`/work/requests/${request.actor}/${request.slug}`}
            sx={{ px: 0 }}
          >
            {request.current?.body.outcome}
          </Button>
          <Typography variant="caption" display="block" color="text.secondary">
            {request.actor} · {request.slug} · {request.versions.length} version{request.versions.length === 1 ? '' : 's'}
          </Typography>
        </Box>
      ))}
      <Button component={RouterLink} to="/work" sx={{ px: 0, alignSelf: 'flex-start' }}>Back to Work</Button>
    </Stack>
  )
}
