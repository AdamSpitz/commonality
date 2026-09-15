import { Alert, Link, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { CROWD_JOBS, jobsDocHref, type CrowdJobId } from '../lib/jobs'

export function JobTip({
  job,
  title,
  children,
  testId,
}: {
  job?: CrowdJobId
  title?: string
  children: string
  testId?: string
}) {
  const catalog = job ? CROWD_JOBS.find((entry) => entry.id === job) : undefined
  const href = jobsDocHref(catalog)

  return (
    <Alert severity="info" sx={{ borderRadius: 2 }} data-testid={testId ?? (job ? `job-tip-${job}` : 'job-tip')}>
      {title && (
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
          {title}
        </Typography>
      )}
      <Typography variant="body2" component="div">
        {children}{' '}
        <Link component={RouterLink} to={href} underline="hover" sx={{ fontWeight: 600 }}>
          Do the part you’d do anyway
        </Link>
      </Typography>
    </Alert>
  )
}
