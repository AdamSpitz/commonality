import { Button, Paper, Stack, Typography } from '@mui/material'
import { DomainLandingPage } from '../components/DomainLandingPage'
import { getDomainUrl } from '../domainUrls'

const sections = [
  {
    eyebrow: 'Create',
    title: 'Launch a public-goods project',
    description: 'Write what you want to build, set a funding goal, and publish an assurance contract without applications or gatekeepers.',
    path: '/projects/new',
    cta: 'Start a project',
  },
  {
    eyebrow: 'Fund',
    title: 'Pledge only if enough others join',
    description: 'Back one project at a time. If the goal is not met, pledges can be refunded instead of disappearing into a failed campaign.',
    path: '/projects',
    cta: 'Browse projects',
  },
  {
    eyebrow: 'Reward',
    title: 'Fund proven work retroactively',
    description: 'Buy and burn donation-receipt tokens from early backers when a project has already demonstrated that it worked.',
    path: '/projects',
    cta: 'Find completed projects',
  },
]

export function PubstarterLandingPage() {
  return (
    <DomainLandingPage
      eyebrow="Pubstarter"
      title="Kickstarter for public goods."
      description="Create and fund individual public-goods projects with pledge-and-refund assurance contracts, public receipts, leaderboards, and optional retroactive funding."
      spotlightLabel="One project, one job"
      spotlightText="Use Pubstarter when you know the specific project you want to create or back. For ongoing cause-based giving where a delegate chooses projects for you, use Alignment instead."
      heroActions={[
        { label: 'Browse projects', path: '/projects' },
        { label: 'Start a project', path: '/projects/new', variant: 'outlined' },
      ]}
      sections={sections}
    >
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between">
          <Stack spacing={0.75} sx={{ maxWidth: 760 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              Need ongoing cause funding?
            </Typography>
            <Typography variant="h6">Want to give to a cause without picking every project yourself?</Typography>
            <Typography variant="body2" color="text.secondary">
              Alignment is for ongoing cause-based giving: pledge monthly, assign funds to a delegate you trust, and let them find the best projects. Pubstarter stays focused on individual contracts.
            </Typography>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component="a" href={getDomainUrl('alignment', '/', { fallbackHref: '#' })} variant="contained">
              Open Alignment
            </Button>
            <Button component="a" href={getDomainUrl('commonality', '/docs/roles/fund-something', { fallbackHref: '#' })} variant="outlined">
              Read the funding role docs
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </DomainLandingPage>
  )
}
