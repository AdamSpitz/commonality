import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    eyebrow: 'Browse',
    title: 'See bridge-building content',
    description: 'Browse funded content across platforms and prioritize creators who communicate across divides.',
    path: '/content',
    cta: 'Browse content',
  },
  {
    eyebrow: 'Create',
    title: 'Submit as a creator',
    description: 'Creators can verify channels, create contracts, and use the dashboard as their main operating surface.',
    path: '/content/dashboard',
    cta: "I'm a creator",
  },
  {
    eyebrow: 'Understand',
    title: 'Follow the underlying statements',
    description: 'When you want the deeper conceptspace context, jump from this brand into the statement graph underneath it.',
    path: '/statements',
    cta: 'Explore statements',
  },
]

export function NoninflammatoryLandingPage() {
  return (
    <DomainLandingPage
      eyebrow="Noninflammatory Content"
      title="Reward content that lowers the temperature instead of raising it."
      description="This is the political bridge-building surface: content that explains one side to the other in a way that keeps people engaged instead of alienated."
      spotlightLabel="Built on Commonality"
      spotlightText="Use this domain when the framing matters. The underlying content-funding flow is shared, but the messaging and entry points are narrower and more opinionated."
      heroActions={[
        { label: 'Browse content', path: '/content' },
        { label: "I'm a creator", path: '/content/dashboard', variant: 'outlined' },
        { label: 'About the thesis', path: '/about', variant: 'text' },
      ]}
      sections={sections}
    />
  )
}
