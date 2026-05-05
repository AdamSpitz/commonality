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
      description="Back articles, videos, posts, and channels you want more of. Pledge with refund protection — your money only moves if enough others join. Creators can verify their channel and claim escrowed funds."
      spotlightLabel="How it works"
      spotlightText="Find a creator you want to support. Set a funding threshold. Anyone who pledges gets refunded if the goal is not met. When a creator verifies their channel and delivers, they claim the escrow. No platform cut, no gatekeepers."
      heroActions={[
        { label: 'Browse content', path: '/content' },
        { label: 'How it works', path: '/about', variant: 'outlined' },
      ]}
      sections={sections}
    />
  )
}
