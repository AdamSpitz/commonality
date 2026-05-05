import { Button, Paper, Stack, Typography } from '@mui/material'
import { DomainLandingPage } from '../components/DomainLandingPage'
import { getDomainUrl } from '../domainUrls'

const sections = [
  {
    eyebrow: 'Statements',
    title: 'Content-addressed claims',
    description: 'Conceptspace treats statements as durable primitives: users sign specific text, and other systems can safely reference the same claim by ID.',
    path: '/docs/conceptspace',
    cta: 'Review the primitive',
  },
  {
    eyebrow: 'Graph',
    title: 'Implications reveal indirect support',
    description: 'Implication attestations connect narrow statements to broader claims so apps can count support without forcing everyone into identical wording.',
    path: '/docs/conceptspace',
    cta: 'See how the graph fits',
  },
  {
    eyebrow: 'Trust + AI services',
    title: 'Attesters and nudgers are inspectable',
    description: 'Trust settings, attester outputs, and nudger suggestions are explicit data layers that product sites can reuse without hiding the judgment calls.',
    path: '/docs/conceptspace',
    cta: 'Understand the services',
  },
]

export function ConceptspaceLandingPage() {
  return (
    <DomainLandingPage
      eyebrow="Conceptspace"
      title="The shared infrastructure beneath the consumer sites."
      description="Conceptspace is the developer-facing layer that Tally, Alignment, Pubstarter, Content Funding, and CSM all build on: content-addressed statements, on-chain signatures, an implication graph, AI attesters, and user-controlled trust settings."
      spotlightLabel="For developers, not end users"
      spotlightText="If you want to sign statements or browse petitions, go to Tally — that's the consumer interface built on this infrastructure. If you want to integrate with the primitives, read the docs here."
      heroActions={[
        { label: 'Developer docs', path: '/docs' },
        { label: 'Open Tally', href: getDomainUrl('tally', '/', { fallbackHref: '#' }), variant: 'outlined' },
      ]}
      sections={sections}
    >
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between">
          <Stack spacing={0.75} sx={{ maxWidth: 760 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              Looking for statement signing?
            </Typography>
            <Typography variant="h6">Use Tally for the consumer statement experience.</Typography>
            <Typography variant="body2" color="text.secondary">
              Tally packages these primitives as petitions and polls with an implication graph, so people can sign statements and see indirect support without needing to understand the developer-facing infrastructure.
            </Typography>
          </Stack>
          <Button component="a" href={getDomainUrl('tally', '/', { fallbackHref: '#' })} variant="contained" size="large">
            Open Tally
          </Button>
        </Stack>
      </Paper>
    </DomainLandingPage>
  )
}
