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
      title="It's time for Internet-age public-goods funding"
      description="Governments and big charity orgs both suck"
      spotlights={[
        {
          label: 'New tech',
          text: 'Internet, blockchains, and AI make a much better approach viable',
        },
        {
          label: 'Trustworthy infrastructure nobody owns',
          text: 'Nobody\'s in charge, so it can\'t be captured by special interests or corrupted by power',
        },
        {
          label: 'Specialized roles',
          text: 'Not everyone wants to follow every potential project or make every donation decision. If you just want to donate, you can delegate the decisions to someone you trust. If you\'re more comfortable recognizing successes after the fact than predicting them in advance, you can do that. If you\'re good at finding promising projects early, you can specialize in that.',
        },
        {
          label: 'Useful for all sorts of public goods',
          text: 'Real-world ones like parks, but also digital public goods like open-source software, social media content, art/music/movies, science, journalism, and more',
        },
      ]}
      sections={sections}
    />
  )
}
