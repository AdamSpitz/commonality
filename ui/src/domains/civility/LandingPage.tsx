import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    eyebrow: 'Readers & donors',
    title: 'Fund it without making it a chore',
    description:
      'Browse the pieces AI evaluators have already vouched for, back the ones you like — or just delegate to a friend and forget about it.',
    cta: 'Explore fundable content',
    path: '/content',
  },
  {
    eyebrow: 'Creators',
    title: "There's money earmarked for this",
    description:
      'Supporters have pooled real money for content that makes its case without contempt. Claim your channel and collect it.',
    cta: 'Get your content funded',
    path: '/content/dashboard',
  },
  {
    eyebrow: 'Everyone',
    title: 'Each side sets its own filter',
    description:
      'What reads as respectful depends on who\'s reading. The filters are open and configurable — trust the defaults, swap them, or run your own.',
    cta: 'View popular filters',
    path: '/filters',
  },
]

export function NoninflammatoryLandingPage() {
  return (
    <DomainLandingPage
      eyebrow="Built on Content Funding"
      title="Fund content you'd actually read from the other side"
      description="Civility puts money behind political writing that makes its case without treating you as stupid or evil. Pledge a few dollars a month, let someone you trust pick the winners, and help create the incentive for content that informs instead of inflames."
      heroActions={[
        { label: 'Explore fundable content', path: '/content' },
        { label: 'View popular filters', path: '/filters', variant: 'outlined' },
        { label: 'Popular Civility statements on Tally', path: '/popular-statements', variant: 'outlined' },
        { label: 'Nominate noninflammatory content', path: '/nominate', variant: 'outlined' },
      ]}
      spotlights={[
        {
          label: "Fund the other side's good stuff — or your own",
          text: "Two reasons people back this: to get more content from the other side that you'd actually read, and to fund writing from your own side that's crafted to land with the other side instead of bouncing off. Either way the test is the same — could the other side read it without bristling? Not bland centrism: a strong case, made hearably.",
        },
        {
          label: 'Let the AI wade through the slop, not you',
          text: "Hunting for the rare good piece in the other side's feed is exactly the aggravating work you don't want to do. AI evaluators do the legwork and hand you a short list of candidates — and you choose which evaluators to trust, or run your own.",
        },
        {
          label: 'Or just hand the keys to a friend',
          text: 'Pledge $10/month, delegate the picking to someone who follows this more closely than you do, and never think about it again. You can check what they fund or change your mind anytime.',
        },
      ]}
      sections={sections}
    />
  )
}
