import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    eyebrow: 'Browse',
    title: 'Find creators by platform',
    description: 'Browse Twitter, YouTube, and Substack creators through the shared content-funding flow.',
    to: '/content/twitter',
    cta: 'Browse creators',
  },
  {
    eyebrow: 'Create',
    title: 'Start a funding contract',
    description: 'Create a contract around a channel or piece of content that you want to reward.',
    to: '/content',
    cta: 'See supported platforms',
  },
  {
    eyebrow: 'Manage',
    title: 'Run your creator workflow',
    description: 'Creators can verify channels, manage contracts, and track claims from one dashboard.',
    to: '/content/dashboard',
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
        { label: 'Browse content', to: '/content' },
        { label: 'Browse statements', to: '/statements', variant: 'outlined' },
        { label: 'Creator dashboard', to: '/content/dashboard', variant: 'text' },
      ]}
      sections={sections}
    />
  )
}
