import { DomainLandingPage } from '../components/DomainLandingPage'
import { getDomainUrl } from '../domainUrls'

const sections = [
  {
    title: 'What does a CSM campaign actually look like?',
    description:
      'Scattered individuals independently sign statements in their own language. The system discovers that their statements all imply the same common ground — and suddenly the "quiet majority" can see itself. That visibility unlocks funding, content, and projects on the focused product sites CSM uses.',
    path: '/about',
    cta: 'Read the full walkthrough',
  },
  {
    title: 'Why not just run a poll?',
    description:
      "Polls force you to choose from someone else's options. Here, you sign your own words — and the system finds who else is saying the same thing in different language. The result is a coalition that nobody manufactured: it was discovered, not organized.",
  },
  {
    title: 'How does this stay neutral?',
    description:
      "The infrastructure is open and verifiable. Neither side controls the implication attester — anyone can run their own. Funding flows through transparent on-chain contracts. There's no central authority that could be captured.",
  },
]

export function CsmLandingPage() {
  return (
    <DomainLandingPage
      title="Giving the hidden majority a voice"
      description="On most issues, the loud extremes dominate, while a quiet supermajority holds common-sense positions that never get heard"
      heroActions={[
        { label: 'Go to Civility', href: getDomainUrl('noninflammatory', '/', { fallbackHref: '/about' }) },
        { label: 'View popular CSM-related statements', path: '/popular-statements', variant: 'outlined' },
        { label: 'View CSM nudgers', path: '/organize', variant: 'outlined' },
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
          text: 'The infrastructure is verifiably neutral, not capturable by either side',
        },
      ]}
      sections={sections}
    />
  )
}
