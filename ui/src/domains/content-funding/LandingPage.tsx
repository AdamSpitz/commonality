import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    eyebrow: 'Browse',
    title: 'Find creators by platform',
    description: 'Browse Twitter, YouTube, and Substack creators through the shared content-funding flow.',
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
    description: 'Creators can verify channels, manage contracts, and track claims from one dashboard.',
    path: '/content/dashboard',
    cta: 'Open creator dashboard',
  },
]

export function ContentFundingLandingPage() {
  return (
    <DomainLandingPage
      eyebrow="Content Funding"
      title="Fund the content you want more of."
      description="This surface is for content contracts first: browse creators, back a channel, and let attestation-driven funding routes handle the rest."
      spotlightLabel="Built on Commonality"
      spotlightText="Content Funding is a focused entry point on top of Commonality's shared funding and attestation infrastructure."
      heroActions={[
        { label: 'Browse content', path: '/content' },
        { label: 'Browse statements', path: '/statements', variant: 'outlined' },
        { label: 'Creator dashboard', path: '/content/dashboard', variant: 'text' },
      ]}
      sections={sections}
    />
  )
}
