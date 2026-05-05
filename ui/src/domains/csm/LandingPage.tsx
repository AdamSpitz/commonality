import { DomainLandingPage } from '../components/DomainLandingPage'

export function CsmLandingPage() {
  return (
    <DomainLandingPage
      title="Giving the quiet middle majority a voice"
      description="On most issues, the loud extremes dominate, while a quiet supermajority holds common-sense positions that never get heard"
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
