import { Box, Paper, Stack, Typography } from '@mui/material'
import { DomainLandingPage } from '../components/DomainLandingPage'
import { getDomainUrl } from '../../shared'

const sections = [
  {
    eyebrow: 'Step 1',
    title: 'Accept donations as delegatable notes',
    description: 'Donors give to your cause and get a public receipt. They can revoke at any time, and they are refunded if a project does not clear its goal — so the ask is lower-risk than a normal donation appeal.',
    href: getDomainUrl('lazyGiving', '/delegation/notes', { fallbackHref: '/docs/key-ideas/delegation' }),
    cta: 'See how delegation works',
  },
  {
    eyebrow: 'Step 2',
    title: 'Direct funds to projects you vet',
    description: 'You keep doing the part you are already good at: deciding which projects deserve money. Record those decisions as alignment attestations instead of in an internal database.',
    href: getDomainUrl('alignment', '/', { fallbackHref: '/docs/key-ideas/funding-portals' }),
    cta: 'Open Aligning',
  },
  {
    eyebrow: 'Step 3',
    title: 'Let the ledger be the annual report',
    description: 'Every delegation, decision, and disbursement is already public and auditable. There is no separate transparency exercise to run, and no overhead to justify to donors.',
    path: '/docs/vision-and-strategy/ease-of-adoption/rails',
    cta: 'Read the rails argument',
  },
]

const adoptionLevels = [
  {
    level: 'Closed',
    summary: 'You are the sole attester.',
    detail: 'Better infrastructure for exactly what you already do. Nothing changes about your decision-making; you are just recording it onchain. This is the level to start at.',
  },
  {
    level: 'Semi-open',
    summary: 'Trusted partners can attest too.',
    detail: 'Shared infrastructure instead of ad-hoc partnerships. More projects surface for your donors, with less coordination overhead between orgs.',
  },
  {
    level: 'Open',
    summary: 'Anyone can attest; you choose whom to trust.',
    detail: 'Maximum project discovery. You still control which attesters count, and you can weight your own more heavily than the rest.',
  },
  {
    level: 'Cross-cutting',
    summary: 'Common ground with orgs you would never partner with.',
    detail: 'Two orgs that disagree about almost everything can still both fund clean drinking water. The implication graph surfaces that agreement without either side having to acknowledge the other.',
  },
]

export function CommonalityForOrganizationsPage() {
  return (
    <DomainLandingPage
      eyebrow="For organizations"
      title="Keep the judgment. Shed the financial org."
      description="Your organization already has a cause, donors who trust it, and real expertise in evaluating projects. What it probably does not love is the overhead around all that — accounts, compliance, fundraising operations, and convincing skeptical donors where the money went. Commonality is rails you can run on instead."
      spotlights={[
        {
          label: 'You do not have to switch anything',
          text: 'The first useful step is to hardcode your org as the only trusted attester for your own fundable-projects board. Your process is unchanged — you are simply recording "this project fits our mission" in public. Everything past that point is a dial you control, not a switch someone else flips.',
        },
      ]}
      heroActions={[
        { label: 'Read the case for established orgs', path: '/docs/vision-and-strategy/ease-of-adoption/for-established-orgs' },
        { label: 'Browse fundable-projects boards', href: getDomainUrl('alignment', '/', { fallbackHref: '#' }), variant: 'outlined' },
      ]}
      sections={sections}
    >
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
        Move at your own pace
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2, maxWidth: 760 }}>
        Each level is strictly better than the one before it, and nothing forces you past the first one.
      </Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
        {adoptionLevels.map(({ level, summary, detail }) => (
          <Paper key={level} sx={{ p: 3, borderRadius: 3 }}>
            <Stack spacing={1} sx={{ height: '100%' }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                {level}
              </Typography>
              <Typography variant="h6">{summary}</Typography>
              <Typography variant="body2" color="text.secondary">{detail}</Typography>
            </Stack>
          </Paper>
        ))}
      </Box>

      <Paper sx={{ p: 3, borderRadius: 3, mt: 3 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6">Newer org, no track record yet?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 760 }}>
            The chicken-and-egg problem — donors want a track record, and you need donors to build one — gets easier here. Start by directing a few small notes toward good projects; the record is onchain and anyone can check it. You do not need to incorporate, hire an accountant, and print glossy annual reports just to look trustworthy. Donors who have never heard of you can at least tell that the rails underneath you are the standard ones.
          </Typography>
        </Stack>
      </Paper>
    </DomainLandingPage>
  )
}
