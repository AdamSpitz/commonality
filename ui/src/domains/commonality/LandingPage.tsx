import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { DomainLandingPage } from '../components/DomainLandingPage'
import { getDomainUrl } from '../domainUrls'

const sections = [
  {
    eyebrow: 'Movement thesis',
    title: 'Internet-age coordination for public goods',
    description: 'Commonality is for people who think public goods are badly underproduced — and that assurance contracts, delegation, blockchains, and AI can make cooperation practical at larger scales.',
    path: '/docs',
    cta: 'Read the thesis',
  },
  {
    eyebrow: 'Funding infrastructure',
    title: 'Create and fund public-goods projects',
    description: 'Browse projects, start a new assurance contract, or use statement-scoped funding portals to organize money around a shared goal.',
    path: '/projects',
    cta: 'Browse projects',
  },
  {
    eyebrow: 'Delegation',
    title: 'Route funds through trusted judgment',
    description: 'Use delegated funding notes when you want aligned people to decide where capital should go instead of making every donor evaluate every project directly.',
    path: '/notes',
    cta: 'Manage delegated funds',
  },
]

const relatedDomains = [
  {
    title: 'Tally',
    description: 'Consumer statement-signing and polling lives here: create claims, sign them, and see what support adds up to through the implication graph.',
    domainId: 'tally' as const,
    cta: 'Open Tally',
  },
  {
    title: 'Content Funding',
    description: 'A focused product for funding creators and content contracts, built on Commonality\'s public-goods funding infrastructure.',
    domainId: 'content-funding' as const,
    cta: 'Open Content Funding',
  },
  {
    title: 'Noninflammatory Content',
    description: 'Fund bridge-building media that helps people hear strong arguments without feeling despised. A focused surface for content that lowers the temperature.',
    domainId: 'noninflammatory' as const,
    cta: 'Open Noninflammatory Content',
  },
  {
    title: 'Common Sense Majority',
    description: 'A movement for the politically homeless: discover the hidden majority, fund content that reveals common ground, and organize around visible support.',
    domainId: 'csm' as const,
    cta: 'Open CSM',
  },
  {
    title: 'Conceptspace',
    description: 'The developer-facing infrastructure layer for statements, implication attestations, signing primitives, nudgers, and trust data.',
    domainId: 'conceptspace' as const,
    cta: 'Open Conceptspace',
  },
]

export function CommonalityLandingPage() {
  return (
    <DomainLandingPage
      eyebrow="Commonality"
      title="Build the movement for better public-goods funding."
      description="Commonality is a movement site for internet-age coordination and the funding tools that make that coordination concrete: assurance contracts, funding portals, and delegated capital."
      spotlightLabel="What you can do here"
      spotlightText="Fund public goods without personal risk. Pledge to a project, but only pay if enough others join. Delegate your money to someone whose judgment you trust. Start a project without gatekeepers or applications." 
      heroActions={[
        { label: 'Start with the thesis', path: '/docs' },
        { label: 'See a walkthrough', path: '/docs/use-case-walkthroughs/block-party', variant: 'outlined' },
        { label: 'Browse projects', path: '/projects', variant: 'outlined' },
        { label: 'Open Tally', href: getDomainUrl('tally', '/', { fallbackHref: '#' }), variant: 'text' },
      ]}
      sections={sections}
    >
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Choose your path
      </Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, mb: 4 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Stack spacing={1}>
            <Typography variant="h6">I want to fund something</Typography>
            <Typography variant="body2" color="text.secondary">
              Browse projects, pledge to a cause, or delegate to someone you trust. Your money is refunded if the goal isn't met.
            </Typography>
            <Button component={RouterLink} to="/projects" size="small">Browse projects</Button>
          </Stack>
        </Paper>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Stack spacing={1}>
            <Typography variant="h6">I have a project</Typography>
            <Typography variant="body2" color="text.secondary">
              Set up an assurance contract in minutes. No gatekeepers, no applications. Describe what you need and let backers find you.
            </Typography>
            <Button component={RouterLink} to="/projects/new" size="small">Start a project</Button>
          </Stack>
        </Paper>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Stack spacing={1}>
            <Typography variant="h6">I want to delegate</Typography>
            <Typography variant="body2" color="text.secondary">
              Help others direct their funds wisely. Build a transparent track record as a delegate.
            </Typography>
            <Button component={RouterLink} to="/notes" size="small">Manage delegated funds</Button>
          </Stack>
        </Paper>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Stack spacing={1}>
            <Typography variant="h6">I want to learn more</Typography>
            <Typography variant="body2" color="text.secondary">
              Read the movement thesis, explore the key ideas, or walk through a real funding scenario.
            </Typography>
            <Button component={RouterLink} to="/docs" size="small">Read the thesis</Button>
          </Stack>
        </Paper>
      </Box>

      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Related product sites
      </Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
        {relatedDomains.map((domain) => (
          <Paper key={domain.title} sx={{ p: 3, borderRadius: 3 }}>
            <Stack spacing={1.5} sx={{ height: '100%' }}>
              <Typography variant="h6">{domain.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                {domain.description}
              </Typography>
              <Button component="a" href={getDomainUrl(domain.domainId, '/', { fallbackHref: '#' })} size="small">
                {domain.cta}
              </Button>
            </Stack>
          </Paper>
        ))}
      </Box>
    </DomainLandingPage>
  )
}
