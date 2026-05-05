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
      title="Retroactive crowdfunding for public goods."
      description="Either the project reaches its funding goal or your pledge is refunded."
      spotlights={[
        {
          label: 'Two ways to give',
          text: 'Don\'t want to gamble on which projects will pan out? Fund proven projects retroactively, after they\'ve delivered, to compensate the scouts who took a risk by investing early — your contribution is still valuable to the ecosystem and appears on the list of contributors. Not inclined to make each decision personally? Delegate your donation decisions to anyone you trust; your name will still show up on the contributor list.',
        },
      ]}
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
              Alignment is for ongoing cause-based giving, and Delegation is for assigning funds to someone you trust. Pubstarter stays focused on individual contracts.
            </Typography>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component="a" href={getDomainUrl('alignment', '/', { fallbackHref: '#' })} variant="contained">
              Open Alignment
            </Button>
            <Button component="a" href={getDomainUrl('delegation', '/', { fallbackHref: '#' })} variant="outlined">
              Open Delegation
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </DomainLandingPage>
  )
}
