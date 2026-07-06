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
    title: 'Spot someone doing it right',
    description:
      "Found a piece — or a creator — that argues across the divide without the contempt? Put it in front of the people funding exactly this.",
    cta: 'Nominate noninflammatory content',
    path: '/nominate',
  },
  {
    eyebrow: 'The bigger movement',
    title: 'See where this content goes: Common Sense Majority',
    description:
      'Civility is the content engine for the Common Sense Majority — the movement that makes shared ground visible on Tally and funds the calm voices instead of the loud ones. See how the pieces fit.',
    domain: 'common-sense-majority' as const,
    path: '/',
    cta: 'Explore Common Sense Majority',
  },
]

export function NoninflammatoryLandingPage() {
  return (
    <DomainLandingPage
      eyebrow="Good-faith argument doesn't pay. Let's change that."
      title="Fund content you'd actually read from the other side"
      description="Some of the good stuff already exists — political writing that argues hard without treating you as stupid or evil — and it goes unrewarded, because feeds only pay for outrage and dunks. The rest doesn't exist yet, for the same reason. Civility is the missing reward: pledge a few dollars a month, and creators see real money earmarked for content that informs instead of inflames — and write toward it."
      heroActions={[
        { label: 'Explore fundable content', path: '/content' },
        { label: 'View popular filters', path: '/filters', variant: 'outlined' },
        { label: 'Popular Civility statements on Tally', path: '/popular-statements', variant: 'outlined' },
      ]}
      spotlights={[
        {
          label: "Fund the other side's good stuff — or your own",
          text: "Two reasons people back this: to get more content from the other side that you'd actually read, and to fund writing from your own side that's crafted to land with the other side instead of bouncing off. Either way the test is the same — could the other side read it without bristling? Not bland centrism: a strong case, made hearably.",
        },
        {
          label: 'Let the AI wade through the slop, not you',
          text: "Hunting for the rare good piece in the other side's feed is exactly the aggravating work you don't want to do. AI evaluators read the slop and hand you a short list — and because judging tone is subjective, they're open: read exactly how they judge, swap them, or run your own. No single gatekeeper.",
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
