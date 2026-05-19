import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { DomainLandingPage } from '../components/DomainLandingPage'
import { getDomainUrl } from '../domainUrls'

const sections = [
  {
    eyebrow: 'Verticals',
    title: 'Start with one concrete audience',
    description: 'A vertical should lead with a job users already recognize — fund content, sign statements, organize around a hidden majority, or back local projects.',
    href: getDomainUrl('commonality', '/docs/vision-and-strategy/ease-of-adoption/dial-not-switch', { fallbackHref: '#' }),
    cta: 'Read the adoption pattern',
  },
  {
    eyebrow: 'Substrate',
    title: 'Reuse the shared primitives',
    description: 'Tally, Pubstarter, Alignment, Delegation, Content Funding, and CSM all reuse statements, trust, public receipts, implication attestations, and funding contracts.',
    href: getDomainUrl('conceptspace', '/', { fallbackHref: '#' }),
    cta: 'Open Conceptspace',
  },
  {
    eyebrow: 'Movement',
    title: 'Keep Commonality as the thesis layer',
    description: 'Commonality explains why public-goods funding can get dramatically better; product sites should stay focused on the job they do for a user.',
    href: getDomainUrl('commonality', '/docs/vision-and-strategy', { fallbackHref: '#' }),
    cta: 'Read the thesis',
  },
]

const verticals = [
  ['Pubstarter', 'Individual assurance contracts for public-goods projects.', 'pubstarter'],
  ['Alignment', 'Ongoing cause funding through portals and alignment attestations.', 'alignment'],
  ['Delegation', 'Donor-delegate relationships and transparent delegate track records.', 'pubstarter'],
  ['Tally', 'Statement signing and indirect support counts.', 'tally'],
  ['Content Funding', 'Funding contracts for content and creators.', 'content-funding'],
  ['Civility', 'A focused content vertical for bridge-building media.', 'noninflammatory'],
  ['Common Sense Majority', 'A movement vertical for hidden-majority politics.', 'csm'],
] as const

export function CommonalityFounderPage() {
  return (
    <DomainLandingPage
      eyebrow="Founder / organizer pitch"
      title="Build a vertical on the public-goods substrate."
      description="Commonality is not one giant consumer app. It is a reusable coordination substrate: statements, implication graphs, funding contracts, delegation, trust, and public records that focused verticals can package for specific audiences."
      spotlights={[
        {
          label: 'The rule',
          text: 'Lead with one concrete job. Do not ask users to understand the whole ecosystem before they can act. The shared substrate should make the vertical stronger without becoming the vertical\'s homepage.',
        },
      ]}
      heroActions={[
        { label: 'Read the movement thesis', path: '/docs/vision-and-strategy' },
        { label: 'Open Conceptspace', href: getDomainUrl('conceptspace', '/', { fallbackHref: '#' }), variant: 'outlined' },
      ]}
      sections={sections}
    >
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Existing verticals and product surfaces
      </Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
        {verticals.map(([name, description, domainId]) => (
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
    </DomainLandingPage>
  )
}
