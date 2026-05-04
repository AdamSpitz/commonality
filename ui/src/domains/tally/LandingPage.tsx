import { DomainLandingPage } from '../components/DomainLandingPage'
import { getDomainUrl } from '../domainUrls'

const sections = [
  {
    eyebrow: 'Petitions + polls',
    title: 'Sign statements you stand behind',
    description: 'Create or sign claims, then see both direct support and the wider coalition implied by related statements.',
    path: '/start',
    cta: 'Start signing',
  },
  {
    eyebrow: 'Implication graph',
    title: 'See what support adds up to',
    description: 'Tally connects statements through attested implications so one signature can count toward broader, compatible claims.',
    path: '/explore',
    cta: 'Explore the graph',
  },
  {
    eyebrow: 'Public record',
    title: 'Browse statements and profiles',
    description: 'Look up claims, inspect who signed them, and visit user profiles to understand the visible coalition around an idea.',
    path: '/statements',
    cta: 'Browse statements',
  },
]

export function TallyLandingPage() {
  return (
    <DomainLandingPage
      eyebrow="Tally"
      title="Petitions and polls with an implication graph."
      description="Tally is the consumer statement-signing site for Commonality: sign claims, browse public support, and see how related statements reveal larger coalitions."
      spotlightLabel="Built on Conceptspace"
      spotlightText="The signing, trust, nudger, and implication primitives are shared infrastructure. Tally packages them as a focused place for people who just want to make support visible."
      heroActions={[
        { label: 'Start signing', path: '/start' },
        { label: 'See a walkthrough', href: getDomainUrl('commonality', '/docs/use-case-walkthroughs/common-sense-majority', { fallbackHref: '#' }), variant: 'outlined' },
        { label: 'Explore statements', path: '/statements', variant: 'outlined' },
        { label: 'Tune trust settings', path: '/settings', variant: 'text' },
      ]}
      sections={sections}
    />
  )
}
