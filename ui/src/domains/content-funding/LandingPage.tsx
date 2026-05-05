import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    eyebrow: 'Browse',
    title: 'Find creators by platform',
    description: 'Browse Twitter, YouTube, and Substack creators, then open a channel to fund specific work or invite the creator to claim escrow.',
    path: '/content/twitter',
    cta: 'Browse creators',
  },
  {
    eyebrow: 'Create',
    title: 'Start a funding contract',
    description: 'Create a contract around a channel or piece of content that you want to reward.',
    path: '/content',
    cta: 'See supported platforms',
  },
  {
    eyebrow: 'Manage',
    title: 'Run your creator workflow',
    description: 'Creators can verify channels, collect escrowed funds, manage contracts, and track claims from one dashboard.',
    path: '/content/dashboard',
    cta: 'Open creator dashboard',
  },
  {
    eyebrow: 'Learn',
    title: 'How creator payouts work',
    description: 'See the reader, creator, and delegate flows in plain language before opening a contract.',
    path: '/about',
    cta: 'How it works',
  },
]

export function ContentFundingLandingPage() {
  return (
    <DomainLandingPage
      title="Fund the kind of social-media content you want to see."
      description="An alternative to ads, which reward clickbait and outrage. Funny, educational, investigative, noninflammatory — you name the criterion."
      spotlights={[
        {
          label: 'Works with your favorite platforms',
          text: 'Works with X, YouTube, and Substack — fund creators you like even if they haven\'t registered here yet.',
        },
      ]}
      heroActions={[
        { label: 'Browse content', path: '/content' },
        { label: 'How it works', path: '/about', variant: 'outlined' },
      ]}
      sections={sections}
    />
  )
}
