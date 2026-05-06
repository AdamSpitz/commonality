import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    title: 'Want to find out when your own side is lying to you?',
    description: "Get recommendations vetted by *your* side's AI filter, for noninflammatory content from the *other* side",
  },
  {
    title: "Want your side's ideas to actually reach the other side?",
    description: 'Fund the messengers who know how to deliver them',
  },
]

export function NoninflammatoryLandingPage() {
  return (
    <DomainLandingPage
      title="Fund civility"
      description="Let's reward noninflammatory content"
      heroActions={[
        { label: 'View popular filters', path: '/filters' },
        { label: 'View popular Civility-related statements on Tally', path: '/popular-statements', variant: 'outlined' },
        { label: 'Explore fundable content', path: '/content', variant: 'outlined' },
        { label: 'Nominate noninflammatory content', path: '/nominate', variant: 'outlined' },
      ]}
      spotlights={[
        {
          label: 'Each side gets to say what they find inflammatory',
          text: 'Identify and fund content that passes your own side\'s - or the other side\'s - "will this content *not* piss me off?" filter',
        },
        {
          label: "No need to go wading through the other side's bullshit",
          text: "AI does the filtering so you don't have to",
        },
      ]}
      sections={sections}
    />
  )
}
