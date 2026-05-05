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
      eyebrow="Noninflammatory Content"
      title="Reward content that lowers the temperature instead of raising it."
      description="Most political content is designed to make you angry at the other side. Fund something different: content that makes a strong case one side genuinely believes — in a way the other side can actually hear."
      spotlightLabel="What noninflammatory means"
      spotlightText="A noninflammatory piece argues a position clearly and forcefully. It doesn't pretend there are no sides. It just doesn't rely on contempt, ad hominem, or outgroup bait to make its case. The goal: someone who starts out disagreeing reads it and thinks 'I see why they believe that' — even if they still disagree."
      heroActions={[
        { label: 'Browse content', path: '/content' },
        { label: 'Get paid for bridge-building work', path: '/content/dashboard', variant: 'outlined' },
      ]}
      sections={getSections()}
    />
  )
}
