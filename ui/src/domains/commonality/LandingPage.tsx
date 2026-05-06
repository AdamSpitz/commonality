import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    title: 'Read more about the vision',
    description: 'What is this all about?',
    path: '/docs',
    cta: 'Read the vision',
  },
  {
    title: 'For founders/organizers',
    description: "it's easy to build a vertical on this substrate, here's how, here's some examples",
    path: '/founders',
    cta: 'Founder pitch',
  },
  {
    title: 'How can I participate?',
    description: '(link to a page that points to Alignment, Civility, CSM, etc., and explains what each is for)',
    path: '/participate',
    cta: 'Find a place to participate',
  },
]

export function CommonalityLandingPage() {
  return (
    <DomainLandingPage
      title="It's time for Internet-age public-goods-funding"
      description="Governments and big charity orgs both suck"
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
