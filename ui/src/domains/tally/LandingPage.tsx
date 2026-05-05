import { DomainLandingPage } from '../components/DomainLandingPage'
import { getDomainUrl } from '../domainUrls'

const sections = [
  {
    eyebrow: 'Sign',
    title: 'Put your name behind what you believe',
    description: 'Create or sign statements — petitions, declarations, positions — in your own words. Signatures are public and permanent, but revocable.',
    path: '/start',
    cta: 'Start signing',
  },
  {
    eyebrow: 'Discover',
    title: 'See how much support really exists',
    description: 'Related statements are connected, so your single signature reveals the full coalition behind the broader idea — not just the exact wording you signed.',
    path: '/explore',
    cta: 'Explore coalitions',
  },
  {
    eyebrow: 'Browse',
    title: 'Look up claims and who stands behind them',
    description: 'Search public statements, see current signers, and understand the real coalition around any idea.',
    path: '/statements',
    cta: 'Browse statements',
  },
]

export function TallyLandingPage() {
  return (
    <DomainLandingPage
      title="Petitions and polls."
      description="Sign statements of what you believe, in your own words. See how many agree, even if they used different words to say it."
      spotlights={[
        {
          label: 'Why this is different',
          text: "You sign 'our city should fix the potholes on Maple Street.' Tally reveals this implies 'the city should maintain basic infrastructure,' so your support counts toward that broader claim too. Someone else signed a completely different statement about sidewalk repair — and you show up in the same coalition. You never coordinated, never compromised on wording, but the system reveals you agree.",
        },
      ]}
      heroActions={[
        { label: 'Start signing', path: '/start' },
        { label: 'See a walkthrough', href: getDomainUrl('commonality', '/docs/use-case-walkthroughs/common-sense-majority', { fallbackHref: '#' }), variant: 'outlined' },
      ]}
      sections={sections}
    />
  )
}
