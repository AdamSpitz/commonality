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
      title: 'Sign the statements behind the content',
      description: 'Want to put your name behind the positions this content represents? Tally is where you sign statements and see how many others independently share your view.',
      href: getDomainUrl('tally', '/statements', { fallbackHref: '#' }),
      cta: 'Explore statements on Tally',
    },
  ]
}

export function NoninflammatoryLandingPage() {
  return (
    <DomainLandingPage
      title="Fund civility. AI does the filtering so you don't have to."
      description="Identify and fund content that passes your own side's — or the other side's — 'will this content not piss me off?' filter."
      spotlights={[
        {
          label: 'Two use cases',
          text: 'Want to find out when your own side is lying to you, but can\'t stomach following the other side\'s bullshit? Get recommendations vetted by your side, for noninflammatory content from the other side. Want your side\'s ideas to actually reach the other side? Fund the messengers who know how to deliver them.',
        },
      ]}
      heroActions={[
        { label: 'Browse content', path: '/content' },
        { label: 'Get paid for bridge-building work', path: '/content/dashboard', variant: 'outlined' },
      ]}
      sections={getSections()}
    />
  )
}
