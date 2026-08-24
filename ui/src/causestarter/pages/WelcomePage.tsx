import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { CrowdJobs } from '../components/CrowdJobs'
import { createCausePath } from '../lib/causeStore'
import { JOBS_DOC_PATH } from '../lib/jobs'

/** Always the first-visit pitch, even if this device already has causes. */
export function WelcomePage() {
  const navigate = useNavigate()

  return (
    <Stack spacing={3} data-testid="home-landing">
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          background: (theme) =>
            theme.palette.mode === 'light'
              ? 'linear-gradient(160deg, rgba(15,118,110,0.10) 0%, rgba(255,252,247,0.95) 55%, #fff 100%)'
              : 'linear-gradient(160deg, rgba(45,212,191,0.14) 0%, rgba(15,23,42,0.9) 60%, #0b1220 100%)',
        }}
      >
        <Typography variant="overline" sx={{ letterSpacing: '0.14em', fontWeight: 700, color: 'primary.main' }}>
          CauseStarter
        </Typography>
        <Typography
          variant="h3"
          component="h1"
          sx={{
            mt: 0.5,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            fontSize: { xs: '1.85rem', sm: '2.35rem' },
            lineHeight: 1.15,
          }}
        >
          There are enough of us. We just couldn’t work together.
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5, maxWidth: 560 }}>
          Give money without becoming a grant officer. Spot projects without bankrolling them.
          Do the work without knowing a foundation. Sign what you actually mean. The rest is
          optional.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 3 }}>
          <Button
            variant="contained"
            size="large"
            data-testid="home-start-cause"
            onClick={() => navigate(createCausePath())}
            sx={{ minHeight: 48, borderRadius: 999, fontWeight: 700, textTransform: 'none', px: 3 }}
          >
            Start a cause board
          </Button>
          <Button
            component={RouterLink}
            to={JOBS_DOC_PATH}
            variant="outlined"
            size="large"
            sx={{ minHeight: 48, borderRadius: 999, fontWeight: 700, textTransform: 'none', px: 3 }}
          >
            Pick a job
          </Button>
        </Stack>
      </Paper>

      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          Take the job you’d take anyway
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Nobody has to agree on a leader, a manifesto, or a treasury. Overlap is enough.
        </Typography>
        <CrowdJobs />
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Docs
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          How to start a cause board, the full ugh-catalog, walkthroughs, and the longer argument.
          There is no directory of other people’s cause boards — you get there by their link.
        </Typography>
        <Button
          component={RouterLink}
          to="/docs"
          sx={{ mt: 1.5, textTransform: 'none', fontWeight: 600 }}
        >
          Open docs
        </Button>
      </Paper>
    </Stack>
  )
}
