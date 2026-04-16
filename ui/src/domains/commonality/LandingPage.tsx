import { Box, Paper, Typography } from '@mui/material'
import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    eyebrow: 'Common ground',
    title: 'Statements and implication graphs',
    description: 'Start with the conceptspace. See what people have signed, how ideas connect, and where shared values already exist.',
    to: '/statements',
    cta: 'Browse statements',
  },
  {
    eyebrow: 'Public goods',
    title: 'Projects and funding portals',
    description: 'Fund projects directly or follow a cause-specific portal built around a statement that matters to you.',
    to: '/projects',
    cta: 'Browse projects',
  },
  {
    eyebrow: 'Focused domains',
    title: 'Content funding and bridge-building',
    description: 'The same infrastructure also powers more focused surfaces for creators, noninflammatory content, and movement work.',
    to: '/content',
    cta: 'Explore creator funding',
  },
]

const focusedDomains = [
  {
    title: 'Content Funding',
    description: 'A dedicated entry point for funding tweets, videos, and posts without needing the whole platform context first.',
  },
  {
    title: 'Noninflammatory Content',
    description: 'A more opinionated surface for rewarding content that explains one side to the other without contempt.',
  },
  {
    title: 'Common Sense Majority',
    description: 'A movement-oriented framing built on the same conceptspace and funding infrastructure.',
  },
]

export function CommonalityLandingPage() {
  return (
    <DomainLandingPage
      eyebrow="Commonality"
      title="Find common ground first, then fund the work that follows from it."
      description="Commonality is the full platform: conceptspace, project funding, creator funding, delegation, trust, and docs for how the pieces fit together."
      spotlightLabel="Full platform"
      spotlightText="Use this domain when you want the whole system rather than a single branded surface. It is the home of the infrastructure and the place where the focused domains connect back into shared concepts."
      heroActions={[
        { label: 'Start with docs', to: '/docs' },
        { label: 'Browse statements', to: '/statements', variant: 'outlined' },
        { label: 'Browse projects', to: '/projects', variant: 'text' },
      ]}
      sections={sections}
    >
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Focused domain entry points
      </Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
        {focusedDomains.map((domain) => (
          <Paper key={domain.title} sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {domain.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {domain.description}
            </Typography>
          </Paper>
        ))}
      </Box>
    </DomainLandingPage>
  )
}
