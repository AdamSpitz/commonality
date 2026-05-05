import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    title: 'For founders/organizers',
    description: "it's easy to build a vertical on this substrate, here's how, here's some examples",
  },
]

export function CommonalityLandingPage() {
  return (
    <DomainLandingPage
      title="It's time for Internet-age public-goods-funding"
      description="Governments and big charity orgs both suck;"
      spotlights={[
        {
          label: 'New tech',
          text: 'Internet, blockchains, and AI make a much better approach viable',
        },
      ]}
      sections={sections}
    />
  )
}
