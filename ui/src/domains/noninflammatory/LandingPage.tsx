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
      description: 'Creators can verify channels, create contracts, and use the dashboard as their main operating surface.',
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
      description="This is the political bridge-building surface: content that explains one side to the other in a way that keeps people engaged instead of alienated."
      spotlightLabel="Strong arguments without contempt"
      spotlightText="Start with content that a reasonable person on the other side could actually hear. The contract flow comes from Content Funding, and statement exploration lives on Tally."
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
