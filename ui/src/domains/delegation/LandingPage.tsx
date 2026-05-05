import { Button, Paper, Stack, Typography } from '@mui/material'
import { DomainLandingPage } from '../components/DomainLandingPage'
import { getDomainUrl } from '../domainUrls'

const sections = [
  {
    eyebrow: 'Donors',
    title: 'Let trusted judgment route your money',
    description: 'Create a delegatable fund, choose who can direct it, and keep visibility into every project it supports.',
    path: '/notes/new',
    cta: 'Create a delegated fund',
  },
  {
    eyebrow: 'Delegates',
    title: 'Manage funds entrusted to you',
    description: 'See the funds you control, direct them toward good projects, and build a transparent on-chain track record.',
    path: '/notes',
    cta: 'Manage funds',
  },
  {
    eyebrow: 'Control',
    title: 'Revoke or redirect anytime',
    description: 'Delegation is a relationship, not a lock-in. Inspect chains, split funds, reclaim control, and redirect when your judgment changes.',
    path: '/notes',
    cta: 'View my funds',
  },
]

export function DelegationLandingPage() {
  return (
    <DomainLandingPage
      title="Trust someone's judgment? Route your donations through them."
      description="They decide which projects to fund; your name still shows up on the contributor list; revoke anytime. Works across Pubstarter, Alignment, and Content Funding."
      spotlights={[
        {
          label: 'Build a public track record',
          text: 'Direct money toward good projects; your decisions are transparently on-chain; no nonprofit required.',
        },
      ]}
      heroActions={[
        { label: 'Create a delegated fund', path: '/notes/new' },
        { label: 'Manage my funds', path: '/notes', variant: 'outlined' },
      ]}
      sections={sections}
    >
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between">
          <Stack spacing={0.75} sx={{ maxWidth: 760 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              Used across the funding sites
            </Typography>
            <Typography variant="h6">Delegation plugs into project and cause funding.</Typography>
            <Typography variant="body2" color="text.secondary">
              Use Alignment when you want cause-based giving, Pubstarter when you want one concrete project, and Delegation when the job is choosing or managing who makes funding decisions.
            </Typography>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component="a" href={getDomainUrl('alignment', '/', { fallbackHref: '#' })} variant="contained">
              Open Alignment
            </Button>
            <Button component="a" href={getDomainUrl('pubstarter', '/', { fallbackHref: '#' })} variant="outlined">
              Open Pubstarter
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </DomainLandingPage>
  )
}
