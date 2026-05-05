import { Button, Paper, Stack, Typography } from '@mui/material'
import { DomainLandingPage } from '../components/DomainLandingPage'
import { getDomainUrl } from '../domainUrls'

const sections = [
  {
    eyebrow: 'Donors',
    title: 'Give to a cause and let someone you trust pick the projects',
    description: 'Pledge funds to a cause, then use Delegation to assign them to someone whose judgment you trust. They find the best projects; you keep full visibility and can redirect at any time.',
    href: getDomainUrl('delegation', '/notes/new', { fallbackHref: '#' }),
    cta: 'Set up delegation',
  },
  {
    eyebrow: 'Delegates',
    title: 'Build a transparent track record',
    description: 'Direct pooled funds toward aligned projects, sub-delegate where others have better judgment, and let donors inspect every decision you make.',
    href: getDomainUrl('delegation', '/notes', { fallbackHref: '#' }),
    cta: 'Manage delegated funds',
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
      description="Alignment is for recurring cause-based giving: portals organized around causes, with transparent attestations that connect projects to the statements donors care about. When you want someone else to choose specific projects, Delegation handles that donor-delegate relationship."
      spotlightLabel="No second job required"
      spotlightText="You care about local journalism. A portal gathers projects aligned with that cause and shows the attestations behind each match. If you want a journalist-curator to choose among them for you, Delegation is one click away."
      heroActions={[
        { label: 'Set up delegation', href: getDomainUrl('delegation', '/notes/new', { fallbackHref: '#' }) },
        { label: 'Browse statements on Tally', href: getDomainUrl('tally', '/statements', { fallbackHref: '#' }), variant: 'outlined' },
      ]}
      sections={sections}
    >
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between">
          <Stack spacing={0.75} sx={{ maxWidth: 760 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              Need one project?
            </Typography>
            <Typography variant="h6">Need a delegate or one specific project?</Typography>
            <Typography variant="body2" color="text.secondary">
              Alignment is for cause portals and project-cause attestations. Delegation handles trusted donor-delegate relationships; Pubstarter handles one concrete project.
            </Typography>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component="a" href={getDomainUrl('delegation', '/', { fallbackHref: '#' })} variant="contained">
              Open Delegation
            </Button>
            <Button component="a" href={getDomainUrl('pubstarter', '/', { fallbackHref: '#' })} variant="outlined">
              Open Pubstarter
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </DomainLandingPage>
  )
}
