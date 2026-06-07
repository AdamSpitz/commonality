import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    eyebrow: 'Where this is headed',
    title: 'Sign once, counted forever',
    description:
      'Today your count includes everyone who signed an equivalent statement. The goal: as unique-human-ID standards mature, your single signature will count you — as one real person, deduplicated — across every equivalent statement, with no re-signing. Say what you believe once, and stay counted.',
  },
  {
    title: 'How does counting indirect support work — and why is it conservative?',
    description:
      'People sign statements in their own words. An AI implication service finds statements that clearly imply each other — "I support universal background checks for gun purchases" clearly implies "I think gun purchases should be regulated" — and counts those signers together. It is deliberately strict: "I want to reduce gun violence" does NOT imply any particular policy, so if there is any doubt at all, the attester says no. The point is to find genuine overlap, not manufacture it.',
  },
  {
    title: "Don't trust our implication service?",
    description:
      "You don't have to. The implication service's AI prompt is open source. Also, anyone can run their own implication attester, and users can choose to trust whichever one(s) they prefer. Tally is built on open infrastructure — the implication graph is just a set of attestations anyone can contribute to or verify.",
  },
]

export function TallyLandingPage() {
  return (
    <DomainLandingPage
      title="Petitions and polls, in your own words"
      description="Sign exactly what you believe. You still get counted alongside everyone who agrees — even when they said it in completely different words."
      heroActions={[
        { label: 'Start signing', path: '/start', variant: 'contained' },
        { label: 'Browse statements', path: '/statements', variant: 'outlined' },
      ]}
      spotlights={[
        {
          label: 'No need to compromise',
          text: "Sign a statement worded exactly the way you'd put it — no adopting someone else's framing just to join a cause.",
        },
        {
          label: 'Counted with everyone who agrees',
          text: 'See how many people stand with you, even when they said it in completely different words.',
        },
        {
          label: 'Coalitions that were always there',
          text: "A thousand people scattered across a hundred petitions can't tell they're already a majority. Tally makes that hidden support visible.",
        },
      ]}
      sections={sections}
    />
  )
}
