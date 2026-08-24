import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { CROWD_JOBS, JOBS_DOC_PATH } from '../lib/jobs'

export function CrowdJobs() {
  return (
    <Stack spacing={1.5} data-testid="crowd-jobs">
      {CROWD_JOBS.map((job) => (
        <Paper
          key={job.id}
          elevation={0}
          data-testid={`crowd-job-${job.id}`}
          sx={{
            p: 1.75,
            borderRadius: 2.5,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {job.title}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {job.happyTo}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            But: {job.ugh}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.75 }}>
            So: {job.soYou}
          </Typography>
        </Paper>
      ))}
      <Box>
        <Button
          component={RouterLink}
          to={JOBS_DOC_PATH}
          sx={{ textTransform: 'none', fontWeight: 700, px: 0 }}
          data-testid="crowd-jobs-read-more"
        >
          The full “ugh, but” catalog
        </Button>
      </Box>
    </Stack>
  )
}
