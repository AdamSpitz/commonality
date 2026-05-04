import { Box, Button, Paper, Stack, Typography } from '@mui/material'
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
      spotlightLabel="Movement + funding tools"
      spotlightText="Start with a concrete project, pledge only if enough other people join, or delegate funds to someone whose judgment you trust. Statement signing lives on Tally; content-specific contracts live on Content Funding."
      heroActions={[
        { label: 'Start with the thesis', path: '/docs' },
        { label: 'See a walkthrough', path: '/docs/use-case-walkthroughs/block-party', variant: 'outlined' },
        { label: 'Browse projects', path: '/projects', variant: 'outlined' },
        { label: 'Open Tally', href: getDomainUrl('tally', '/', { fallbackHref: '#' }), variant: 'text' },
      ]}
      sections={sections}
    >
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
