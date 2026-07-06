import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    title: 'Read more about the vision',
    description: 'See the principles behind open, accountable public-goods funding.',
    path: '/docs',
    cta: 'Read the vision',
  },
  {
    title: 'For founders and organizers',
    description: 'Launch a focused community using Commonality\'s shared funding, delegation, and trust tools.',
    path: '/founders',
    cta: 'Founder pitch',
  },
  {
    title: 'How can I participate?',
    description: 'Choose the area that fits you: fund projects, support better media, sign common-ground statements, or delegate to someone you trust.',
    path: '/participate',
    cta: 'Find a place to participate',
  },
]

export function CommonalityLandingPage() {
  return (
    <DomainLandingPage
      title="It's time for Internet-age public-goods funding"
      description="Commonality helps people fund public goods together without putting a government, charity, or platform in charge."
      spotlights={[
        {
          label: 'New tech',
          text: 'The internet, open ledgers, and AI make a more transparent and participatory approach viable.'
        },
        {
          label: 'Trustworthy infrastructure nobody owns',
          text: 'Shared rules and public records make it harder for any one institution to capture the process.'
        },
        {
          label: 'Specialized roles',
          text: 'Not everyone wants to follow every potential project or make every donation decision. If you just want to donate, you can delegate the decisions to someone you trust. If you\'re more comfortable recognizing successes after the fact than predicting them in advance, you can do that. If you\'re good at finding promising projects early, you can specialize in that.',
        },
        {
          label: 'Useful for all sorts of public goods',
          text: 'Use it for real-world goods like parks and mutual aid, or digital public goods like open-source software, journalism, science, art, and media.'
        },
      ]}
      sections={sections}
    />
  )
}
