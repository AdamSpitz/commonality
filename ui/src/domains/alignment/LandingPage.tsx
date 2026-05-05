import { Button, Paper, Stack, Typography } from '@mui/material'
import { DomainLandingPage } from '../components/DomainLandingPage'
import { getDomainUrl } from '../domainUrls'

const sections = [
  {
    eyebrow: 'Donors',
    title: 'Pledge to a cause and be lazy',
    description: 'Create delegatable notes for a cause, assign them to someone you trust, and revoke or redirect them whenever your confidence changes.',
    path: '/notes/new',
    cta: 'Create a note',
  },
  {
    eyebrow: 'Delegates',
    title: 'Build a transparent track record',
    description: 'Direct pooled funds toward aligned projects, sub-delegate where others have better judgment, and let donors inspect your decisions.',
    path: '/notes',
    cta: 'Manage notes',
  },
  {
    eyebrow: 'Attesters',
    title: 'Help aligned projects get discovered',
    description: 'Funding portals use alignment attestations to connect projects and content to the statements and causes people already care about.',
    href: getDomainUrl('commonality', '/docs/roles/help-connect-things', { fallbackHref: '#' }),
    cta: 'Read the role guide',
  },
]

export function AlignmentLandingPage() {
  return (
    <DomainLandingPage
      eyebrow="Alignment"
      title="Ongoing cause funding through trusted judgment."
      description="Alignment is for recurring cause-based giving: funding portals, delegatable notes, delegate track records, and attestations that connect projects to the causes they serve."
      spotlightLabel="For donors who do not want a second job"
      spotlightText="Pick a cause, route funds through someone whose judgment you trust, and let them find the specific Pubstarter projects or content contracts worth backing."
      heroActions={[
        { label: 'Create a delegated note', path: '/notes/new' },
        { label: 'Manage my notes', path: '/notes', variant: 'outlined' },
      ]}
      sections={sections}
    >
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between">
          <Stack spacing={0.75} sx={{ maxWidth: 760 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              Need one project?
            </Typography>
            <Typography variant="h6">Use Pubstarter for individual assurance contracts.</Typography>
            <Typography variant="body2" color="text.secondary">
              Alignment is for cause portals and delegation. When the job is simply to create or pledge to one concrete project, Pubstarter owns that workflow.
            </Typography>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component="a" href={getDomainUrl('pubstarter', '/', { fallbackHref: '#' })} variant="contained">
              Open Pubstarter
            </Button>
            <Button component="a" href={getDomainUrl('tally', '/statements', { fallbackHref: '#' })} variant="outlined">
              Browse statements on Tally
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </DomainLandingPage>
  )
}
