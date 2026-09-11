import { Alert, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { projectPathForAddress } from '../../shared'
import { useExistingBeneficiaryProjects } from '../hooks/useExistingBeneficiaryProjects'
import { useProjectDisavowals } from '../hooks/useProjectDisavowals'
import type { BeneficiaryProjectMatch } from '../projectsForBeneficiary'

function projectLabel(match: BeneficiaryProjectMatch): string {
  return match.name?.trim() || match.id
}

export function ExistingBeneficiaryProjects({ domain }: { domain: string }) {
  const { loading, matches, canonical } = useExistingBeneficiaryProjects(domain)
  const disavowedProjects = useProjectDisavowals()
  const reusable = matches.filter((match) => !disavowedProjects.has(match.id.toLowerCase()))
  if (!canonical) return null
  if (loading) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" data-testid="existing-beneficiary-projects-loading">
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Looking for existing projects for {canonical}…
        </Typography>
      </Stack>
    )
  }
  if (reusable.length === 0) return null
  return (
    <Alert severity="info" data-testid="existing-beneficiary-projects">
      <Typography variant="body2" sx={{ mb: 1 }}>
        Other people have already proposed projects for {canonical}. Reuse one if its
        stated scope already fits; otherwise create a new one. Duplicate projects are
        allowed when the framing, conditions, or stewardship actually differ.
      </Typography>
      <Stack spacing={1}>
        {reusable.map((match) => (
          <Stack key={match.id} spacing={0.25}>
            <Button
              component={RouterLink}
              to={projectPathForAddress(match.id)}
              size="small"
              sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
            >
              {projectLabel(match)}
            </Button>
            {match.description ? (
              <Typography variant="caption" color="text.secondary">
                {match.description}
              </Typography>
            ) : null}
          </Stack>
        ))}
      </Stack>
    </Alert>
  )
}
