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
      eyebrow="Delegation"
      title="Donate through people whose judgment you trust."
      description="Delegation is the shared donor-delegate system for Pubstarter, Alignment, and Content Funding. Your money can flow through someone else's project judgment while your name remains on the contributor list."
      spotlightLabel="Trust, but keep control"
      spotlightText="Pick a curator, expert, friend, or movement organizer. They choose projects; you keep transparent receipts and can revoke or redirect whenever you want. Delegates build public track records without needing to start a nonprofit."
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
