import { DomainLandingPage } from '../components/DomainLandingPage'
import { getDomainUrl } from '../domainUrls'

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
      description="Back articles, videos, posts, and channels you want more of. Supporters can pool funds around a creator, and verified creators can claim the escrow waiting for them."
      spotlightLabel="What you can do here"
      spotlightText="Back a creator or a specific piece of work you want more of. Your money sits in escrow until the creator verifies and claims it, so you risk nothing if they never show up. When you want to dig into the claims behind the content, Tally is where statements live."
      heroActions={[
        { label: 'Browse content', path: '/content' },
        { label: 'How it works', path: '/about', variant: 'outlined' },
        { label: 'See a walkthrough', href: getDomainUrl('commonality', '/docs/use-case-walkthroughs/noninflammatory-content', { fallbackHref: '#' }), variant: 'outlined' },
        { label: 'Explore statements on Tally', href: getDomainUrl('tally', '/statements', { fallbackHref: '#' }), variant: 'outlined' },
        { label: 'Creator dashboard', path: '/content/dashboard', variant: 'text' },
      ]}
      sections={sections}
    />
  )
}
