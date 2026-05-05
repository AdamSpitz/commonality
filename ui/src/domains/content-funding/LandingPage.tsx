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
      eyebrow="Content Funding"
      title="Fund the content you want more of."
      description="Back articles, videos, posts, and channels you want more of. Content Funding uses Pubstarter-style contracts specialized for creator and content workflows."
      spotlightLabel="Built on Pubstarter"
      spotlightText="Use this site for content-specific contracts and channel claiming. Use Pubstarter directly for non-content public-goods projects, and Tally when you want to inspect the statements behind a funding criterion."
      heroActions={[
        { label: 'Browse content', path: '/content' },
        { label: 'How it works', path: '/about', variant: 'outlined' },
      ]}
      sections={sections}
    />
  )
}
