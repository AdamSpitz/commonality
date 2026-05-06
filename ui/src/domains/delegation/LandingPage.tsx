import { Link, Paper, Stack, Typography } from '@mui/material'
import { DomainLandingPage } from '../components/DomainLandingPage'
import { getDomainUrl } from '../domainUrls'

const sections = [
  {
    title: 'Want to give, but feeling lazy?',
    description: 'Route your donations through anyone you trust — they decide which projects to fund; your name still shows up on the contributor list; revoke anytime',
  },
  {
    title: 'Follow the ecosystem closely?',
    description: 'Find people who trust you enough to let you make their donation decisions on their behalf; build a public track record as a delegate; your decisions are transparently on-chain',
  },
]

export function DelegationLandingPage() {
  return (
    <DomainLandingPage
      title="Lazily contribute to causes you care about"
      heroActions={[
        { label: 'View delegation dashboard', path: '/notes' },
      ]}
      sections={sections}
    >
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={1}>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            Supported by
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <Link href={getDomainUrl('pubstarter', '/', { fallbackHref: '/supported-sites' })}>Pubstarter</Link>,{' '}
            <Link href={getDomainUrl('alignment', '/', { fallbackHref: '/supported-sites' })}>Alignment</Link>, and{' '}
            <Link href={getDomainUrl('content-funding', '/', { fallbackHref: '/supported-sites' })}>Content Funding</Link>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            On each site that supports delegation, donations will show up as "Alice Donor (delegated via Bob Delegate)"
          </Typography>
        </Stack>
      </Paper>
    </DomainLandingPage>
  )
}
