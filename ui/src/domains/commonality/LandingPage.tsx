import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { DomainLandingPage } from '../components/DomainLandingPage'
import { getDomainUrl } from '../domainUrls'

const sections = [
  {
    eyebrow: 'Why it matters',
    title: 'Public goods are badly underproduced',
    description: 'Government and charity aggregate too early: slow committees, opaque overhead, political capture, and donors who cannot direct money with precision.',
    path: '/docs/vision-and-strategy/so-what',
    cta: 'Read why this matters',
  },
  {
    eyebrow: 'The mechanism',
    title: 'Late aggregation preserves individual signal',
    description: 'People sign exactly what they believe, pledge to concrete projects, delegate per cause, and let implication and trust networks discover real overlap.',
    path: '/docs/vision-and-strategy/why-its-better/individualization',
    cta: 'See why it is better',
  },
  {
    eyebrow: 'Adoption',
    title: 'Each step is useful on its own',
    description: 'Start with a tip jar, a small project, a delegation relationship, or a standby contract. No one has to buy the whole thesis before acting.',
    path: '/docs/vision-and-strategy/ease-of-adoption',
    cta: 'Explore adoption paths',
  },
]

const productLinks = [
  ['Pubstarter', 'Create or fund one public-goods project.', 'pubstarter'],
  ['Alignment', 'Pledge to causes, delegate, and use funding portals.', 'alignment'],
  ['Tally', 'Sign statements and inspect direct plus indirect support.', 'tally'],
  ['Content Funding', 'Fund creators, channels, and specific pieces of content.', 'content-funding'],
  ['Noninflammatory Content', 'Fund bridge-building political content.', 'noninflammatory'],
  ['Common Sense Majority', 'Make hidden common-sense majorities visible.', 'csm'],
] as const

export function CommonalityLandingPage() {
  return (
    <DomainLandingPage
      eyebrow="Commonality"
      title="A movement for better public-goods funding."
      description="Commonality is the movement and thesis layer for internet-age public-goods coordination: assurance contracts, delegation, implication graphs, trust networks, and public receipts that let people coordinate without a central organization."
      spotlightLabel="The thesis"
      spotlightText="We can fund public goods without forcing everyone into one platform, one treasury, one leader, or one compromised statement. Preserve individual choices longer, aggregate later, and let concrete product sites do the user-facing jobs."
      heroActions={[
        { label: 'Read the thesis', path: '/docs/vision-and-strategy' },
        { label: 'Founder / organizer pitch', path: '/founders', variant: 'outlined' },
      ]}
      sections={sections}
    >
      <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between">
          <Stack spacing={0.75} sx={{ maxWidth: 760 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              Start with a concrete job
            </Typography>
            <Typography variant="h6">The funding and signing tools now have focused homes.</Typography>
            <Typography variant="body2" color="text.secondary">
              Commonality explains the movement. If you want to pledge to one project, pledge to a cause, sign a statement, or fund content, go directly to the product surface for that job.
            </Typography>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component="a" href={getDomainUrl('pubstarter', '/', { fallbackHref: '#' })} variant="contained">
              Open Pubstarter
            </Button>
            <Button component="a" href={getDomainUrl('alignment', '/', { fallbackHref: '#' })} variant="outlined">
              Open Alignment
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Product sites built on the substrate
      </Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
        {productLinks.map(([name, description, domainId]) => (
          <Paper key={name} sx={{ p: 3, borderRadius: 3 }}>
            <Stack spacing={1.5} sx={{ height: '100%' }}>
              <Typography variant="h6">{name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                {description}
              </Typography>
              <Button component="a" href={getDomainUrl(domainId, '/', { fallbackHref: '#' })} size="small">
                Open {name}
              </Button>
            </Stack>
          </Paper>
        ))}
      </Box>

      <Paper sx={{ p: 3, mt: 4, borderRadius: 3 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6">Want a story instead of a thesis?</Typography>
          <Typography variant="body2" color="text.secondary">
            The defunding walkthrough shows how a town gets on the rails, builds delegation capacity, creates a credible threat, and may protect a youth program without spending the backup money at all.
          </Typography>
          <Button component={RouterLink} to="/docs/use-case-walkthroughs/defunding" size="small" sx={{ width: 'fit-content' }}>
            Read the defunding walkthrough
          </Button>
        </Stack>
      </Paper>
    </DomainLandingPage>
  )
}
