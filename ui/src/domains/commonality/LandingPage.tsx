import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    title: 'Read the thesis',
    description:
      "Why we're so bad at funding public goods, why that's newly fixable, and what changes if it works.",
    path: '/docs',
    cta: 'Read the thesis',
  },
  {
    title: 'Find your place',
    description:
      'Sign a statement, fund a project, back a cause, support creators. Pick the one site that matches what you want to do.',
    path: '/participate',
    cta: 'Ways to participate',
  },
  {
    title: 'Build a vertical',
    description:
      'Commonality is a reusable substrate, not one giant app. Package it for an audience you care about.',
    path: '/founders',
    cta: 'Founder pitch',
  },
]

export function CommonalityLandingPage() {
  return (
    <DomainLandingPage
      title="We fund public goods through government and big charities. Both are kind of awful."
      description="Wasteful, opaque, captured by whoever has pull, and slow to the point of paralysis — and that's before you get to the enormous range of public goods they can't fund at all, because the thing is too small, too niche, or the wrong shape for a grant committee. New tech finally makes a better approach viable."
      spotlights={[
        {
          label: 'Nobody owns it',
          text: 'It runs on open ledgers, not an organization. There\'s no treasury to skim, no board to capture, no plug for a hostile government to pull. Every transaction is public by default — the ledger is the annual report.',
        },
        {
          label: 'The mechanism actually works',
          text: 'Assurance contracts let you pledge without risk: your money is refunded if the goal isn\'t met. That defuses the free-rider problem that normally kills things people genuinely want — without anyone having to be coerced or taxed.',
        },
        {
          label: "You don't have to do all the work",
          text: "Don't want to vet every project? Delegate to someone you trust. More comfortable rewarding proven successes than predicting them? Fund things after they've worked. The roles specialize, so even being lazy is a real contribution.",
        },
        {
          label: "It reaches what the big institutions can't",
          text: 'A neighborhood block party, a niche research project, an open-source library, a single piece of journalism or a social-media post. Things far too small or too specific for a grant program — and it scales all the way down.',
        },
      ]}
      sections={sections}
    />
  )
}
