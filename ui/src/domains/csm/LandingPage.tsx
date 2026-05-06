import { DomainLandingPage } from '../components/DomainLandingPage'
import { getDomainUrl } from '../domainUrls'

export function CsmLandingPage() {
  return (
    <DomainLandingPage
      title="Giving the quiet middle majority a voice"
      description="On most issues, the loud extremes dominate, while a quiet supermajority holds common-sense positions that never get heard"
      heroActions={[
        { label: 'Go to Civility', href: getDomainUrl('noninflammatory', '/', { fallbackHref: '#' }) },
        { label: 'View popular CSM-related statements on Tally', href: getDomainUrl('tally', '/statements', { fallbackHref: '#' }), variant: 'outlined' },
        { label: 'View nudgers', path: '/organize', variant: 'outlined' },
      ]}
      spotlights={[
        {
          label: 'Build bridges',
          text: 'Sign statements in your own words; the other side does the same; AI helps find overlap; noninflammatory content nudges people toward common ground',
        },
        {
          label: 'Build momentum',
          text: 'Transparent, verifiable supporter counts and funding flows to demonstrate the size of the movement',
        },
        {
          label: 'Credible neutrality',
          text: 'The infrastructure is verifiably neutral, *not* capturable by either side',
        },
      ]}
    />
  )
}
