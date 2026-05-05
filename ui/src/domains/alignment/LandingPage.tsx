import { Button, Paper, Stack, Typography } from '@mui/material'
import { DomainLandingPage } from '../components/DomainLandingPage'
import { getDomainUrl } from '../domainUrls'

const sections = [
  {
    eyebrow: 'Donors',
    title: 'Give to a cause and let someone you trust pick the projects',
    description: 'Pledge funds to a cause. Assign them to a delegate whose judgment you trust. They find the best projects; you keep full visibility and can redirect at any time.',
    path: '/notes/new',
    cta: 'Start pledging',
  },
  {
    eyebrow: 'Delegates',
    title: 'Build a transparent track record',
    description: 'Direct pooled funds toward aligned projects, sub-delegate where others have better judgment, and let donors inspect every decision you make.',
    path: '/notes',
    cta: 'Manage my pledges',
  },
  {
    eyebrow: 'Connectors',
    title: 'Help aligned projects get discovered',
    description: 'Vouch for projects you believe in. Funding portals use your attestations to surface work that serves the causes donors already care about.',
    href: getDomainUrl('commonality', '/docs/roles/help-connect-things', { fallbackHref: '#' }),
    cta: 'Read the role guide',
  },
]

export function AlignmentLandingPage() {
  return (
    <DomainLandingPage
      eyebrow="Alignment"
      title="Give to what you care about. Let someone you trust handle the details."
      description="Alignment is for recurring cause-based giving. Pledge funds per month to a cause, assign them to a delegate — a curator, an expert, a friend — and let them find the specific projects worth backing. You keep full visibility and can redirect at any time."
      spotlightLabel="No second job required"
      spotlightText="You care about local journalism. You pledge $20/month. You assign it to a journalist-curator whose track record you trust. They find the best investigations worth funding. You get a transparent record of every decision. If you ever disagree, you redirect in one click."
      heroActions={[
        { label: 'Pledge to a cause', path: '/notes/new' },
        { label: 'Manage my pledges', path: '/notes', variant: 'outlined' },
      ]}
      sections={sections}
    >
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between">
          <Stack spacing={0.75} sx={{ maxWidth: 760 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              Need one project?
            </Typography>
            <Typography variant="h6">Just want to back one specific project?</Typography>
            <Typography variant="body2" color="text.secondary">
              Alignment is for ongoing cause-based giving with a delegate. When the job is simply to pledge to one concrete project, Pubstarter is the right tool.
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
