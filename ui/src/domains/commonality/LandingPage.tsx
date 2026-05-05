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
    title: 'Keep individual choices intact longer',
    description: 'People sign exactly what they believe, pledge to concrete projects, delegate per cause, and let implication and trust networks discover real overlap — without forcing compromise up front.',
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
  ['Pubstarter', 'Pledge to one concrete public-goods project. Refunded if the goal is not met.', 'pubstarter'],
  ['Alignment', 'Give through cause-based portals and transparent project-cause attestations.', 'alignment'],
  ['Delegation', 'Choose trusted people to direct your donations while you keep public receipts and control.', 'delegation'],
  ['Tally', 'Sign statements. See the full coalition behind the broader idea.', 'tally'],
  ['Content Funding', 'Fund creators and content you want more of, with pledge-and-refund contracts.', 'content-funding'],
  ['Civility', 'Fund political content that argues without contempt — strong cases that the other side can actually hear.', 'noninflammatory'],
  ['Common Sense Majority', 'Reveal the hidden majority: millions of people who independently hold the same common-sense positions.', 'csm'],
] as const

export function CommonalityLandingPage() {
  return (
    <DomainLandingPage
      eyebrow="Commonality"
      title="A movement for funding what we actually need."
      description="We are remarkably bad at producing the things we collectively need: journalism, research, infrastructure, local organizing. Government aggregates too early. Charity has gatekeepers. Commonality is what funding those things looks like when you solve both problems."
      spotlightLabel="The thesis in plain language"
      spotlightText="The coordination problem isn't that people don't want to contribute. It's that nobody wants to be the sucker who pays when nobody else shows up. Assurance contracts solve that: your pledge only counts if enough others join. A thousand people who all want the same thing — a neighborhood park, local journalism, independent research — can act together without a committee meeting, without knowing each other, without risk."
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
            <Typography variant="h6">Ready to do something concrete?</Typography>
            <Typography variant="body2" color="text.secondary">
              Commonality explains the movement and the thesis. The actual funding and signing tools live on the focused product sites below — go there to pledge to a project, give to a cause, set up delegation, sign a statement, or fund content.
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
        The product sites
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
