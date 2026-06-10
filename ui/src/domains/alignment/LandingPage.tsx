import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    title: 'A friend, not a bureaucracy',
    description:
      "A big charity is fire-and-forget, but impersonal and opaque — you never really know where the money went. Picking projects yourself gives you control, but it's a lot of work. Aligning gives you both at once: pledge to a cause and hand the decisions to someone you actually know and trust. Fire-and-forget ease, and you still know your money's in good hands.",
    domain: 'lazyGiving',
    path: '/delegation/notes/new',
    cta: 'Set up delegation',
  },
  {
    title: 'An easy ask: fund what already worked',
    description:
      "Your delegate doesn't have to be a genius at spotting scams and winners in advance. Because projects can be funded retroactively, they can simply watch for ones that have already delivered and reward those. Predicting the future is hard; recognizing a job well done is easy — which is what makes delegating to a friend actually realistic.",
    path: '/docs/alignment/how-alignment-works',
    cta: 'How the trust graph works',
  },
  {
    title: 'Or pick projects yourself',
    description:
      "Prefer the hands-on path? Start with Explore Causes, open a cause statement, then use its cause board to see the projects aligned with it — curated by your trust network, not a gatekeeper. Fund the ones you like directly on their LazyGiving project pages.",
    path: '/explore',
    cta: 'Explore causes',
  },
  {
    title: "Causes don't need exact wording",
    description:
      "A cause is just a Conceptspace statement. The implication graph connects statements that mean similar things — so a cause board pulls in projects vouched against any cause that implies yours, even when phrased differently. Organic coalitions, no coordination required.",
    domain: 'tally',
    path: '/docs/tally/statements-and-implication-graph',
    cta: 'More on implication',
  },
  {
    title: 'Want to be the one people trust? Vouch, or become a delegate',
    description:
      "Open a LazyGiving project page and use Project Endorsements → Vouch for This Project to attach it to a cause; your vouches reach everyone who trusts you. Build a public track record and others will assign their pledged funds to you to direct.",
    domain: 'lazyGiving',
    path: '/projects',
    cta: 'Browse projects to vouch',
  },
]

export function AlignmentLandingPage() {
  return (
    <DomainLandingPage
      title="Hand your giving to a friend, not a bureaucracy."
      description="Giving to a big charity is easy but impersonal — you never really know where the money goes. Vetting projects yourself gives you control, but it's a second job. Aligning gives you both at once: pledge to a cause and let someone you actually know and trust direct the funds. And it's an easy ask — they don't need to predict winners, just fund the projects that have already delivered. Revoke anytime."
      spotlights={[
        {
          label: 'Best of both, not a compromise',
          text: "A faceless charity is fire-and-forget but opaque. Doing it all yourself is a ton of work. Delegate to a friend instead — someone you know and trust — and you get the fire-and-forget ease and the confidence that your money's in good hands.",
        },
        {
          label: "An easy ask: reward what already worked",
          text: "Your delegate doesn't have to be brilliant at spotting winners in advance. Because projects can be funded retroactively, they can just back the ones that already delivered. That's a low bar — which is exactly why trusting a friend with this is realistic.",
        },
      ]}
      heroActions={[
        { label: 'Set up delegation', domain: 'lazyGiving', path: '/delegation/notes/new' },
        { label: 'How it works', path: '/docs/alignment/how-alignment-works', variant: 'outlined' },
        { label: 'Explore causes', path: '/explore', variant: 'outlined' },
      ]}
      sections={sections}
    />
  )
}
