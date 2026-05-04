import { Button, Paper, Stack, Typography } from '@mui/material'
import { DomainLandingPage } from '../components/DomainLandingPage'

const tallyUrl = import.meta.env.VITE_TALLY_URL || '#'

const sections = [
  {
    eyebrow: 'Statements',
    title: 'Content-addressed claims',
    description: 'Conceptspace treats statements as durable primitives: users sign specific text, and other systems can safely reference the same claim by ID.',
    to: '/',
    cta: 'Review the primitive',
  },
  {
    eyebrow: 'Graph',
    title: 'Implications reveal indirect support',
    description: 'Implication attestations connect narrow statements to broader claims so apps can count support without forcing everyone into identical wording.',
    to: '/',
    cta: 'See how the graph fits',
  },
  {
    eyebrow: 'Trust + AI services',
    title: 'Attesters and nudgers are inspectable',
    description: 'Trust settings, attester outputs, and nudger suggestions are explicit data layers that product sites can reuse without hiding the judgment calls.',
    to: '/',
    cta: 'Understand the services',
  },
]

export function ConceptspaceLandingPage() {
  return (
    <DomainLandingPage
      eyebrow="Conceptspace"
      title="Statement, implication, signing, and trust infrastructure."
      description="Conceptspace is the infrastructure layer beneath the consumer surfaces: content-addressed statements, on-chain signatures, implication attestations, nudgers, and user-controlled trust data."
      spotlightLabel="Infrastructure, not the consumer app"
      spotlightText="End users should go to Tally for statement signing and polling. This surface explains the primitives that Tally, Commonality, Content Funding, Noninflammatory Content, and CSM build on."
      heroActions={[
        { label: 'Conceptspace overview', to: '/' },
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
              Tally packages these primitives as petitions and polls with an implication graph. Configure VITE_TALLY_URL for deployed cross-domain links; local builds use a placeholder until cross-domain URL support is generalized.
            </Typography>
          </Stack>
          <Button component="a" href={tallyUrl} variant="contained" size="large">
            Open Tally
          </Button>
        </Stack>
      </Paper>
    </DomainLandingPage>
  )
}
