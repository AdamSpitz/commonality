import { DomainLandingPage } from '../components/DomainLandingPage'
import { getDomainUrl } from '../domainUrls'

function getSections() {
  return [
    {
      eyebrow: 'Browse',
      title: 'See bridge-building content',
      description: 'Browse funded content across platforms and prioritize creators who communicate across divides.',
      path: '/content',
      cta: 'Browse content',
    },
    {
      eyebrow: 'Create',
      title: 'Get paid for bridge-building work',
      description: 'Creators can verify channels, create contracts, and manage everything from one dashboard.',
      path: '/content/dashboard',
      cta: 'Open creator dashboard',
    },
    {
      eyebrow: 'Tally',
      title: 'Sign the underlying statements',
      description: 'When you want to inspect or sign the claims behind bridge-building content, jump to Tally instead of embedding the full statement UI here.',
      href: getDomainUrl('tally', '/statements', { fallbackHref: '#' }),
      cta: 'Explore statements on Tally',
    },
  ]
}

export function NoninflammatoryLandingPage() {
  return (
    <DomainLandingPage
      eyebrow="Noninflammatory Content"
      title="Reward content that lowers the temperature instead of raising it."
      description="Fund content that helps people on opposite sides actually hear each other — strong arguments without contempt, ad hominem, or cheap outgroup bait."
      spotlightLabel="Strong arguments without contempt"
      spotlightText="Reward creators who make a case you can disagree with while still feeling respected. Fund specific posts, videos, or channels; if the creator verifies, they collect the escrow. When you want to inspect or sign the claims behind the content, head to Tally."
      heroActions={[
        { label: 'Browse content', path: '/content' },
        { label: 'Get paid for bridge-building work', path: '/content/dashboard', variant: 'outlined' },
        { label: 'Read a walkthrough', href: getDomainUrl('commonality', '/docs/use-case-walkthroughs/noninflammatory-content', { fallbackHref: '#' }), variant: 'outlined' },
        { label: 'About the thesis', path: '/about', variant: 'text' },
      ]}
      sections={getSections()}
    />
  )
}
