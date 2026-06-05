import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    title: 'What does implication actually look like?',
    description:
      '"I support universal background checks for gun purchases" clearly implies "I think gun purchases should be regulated." An attester would flag that implication. But "I want to reduce gun violence" does NOT — it\'s too ambiguous to imply any particular policy. If there\'s any doubt, the attester says no.',
  },
  {
    title: 'Not just equivalence — implication',
    description:
      'Two statements don\'t need to mean exactly the same thing. One just needs to clearly imply the other. "I\'m tired of being told I\'m evil for disagreeing" implies "constructive cross-partisan discourse is worth supporting" — not identical, but genuinely implied.',
  },
  {
    title: "Don't trust our attester?",
    description:
      "You don't have to. The implication graph is open infrastructure — anyone can run their own attester. Tools that consume the graph (like Tally's supporter counts) let users choose which attesters they trust.",
  },
]

export function ConceptspaceLandingPage() {
  return (
    <DomainLandingPage
      title="Make concepts linkable"
      description="One small idea: an implication arrow from one statement to another. It's plumbing, not a product — a no-brainer piece of infrastructure that lets any site point at a concept without coordinating on exactly how it's phrased, so nobody has to reinvent it."
      heroActions={[
        { label: 'Read the developer docs', path: '/docs/conceptspace' },
        { label: 'API and SDK docs', path: '/docs/conceptspace#api-and-contract-reference', variant: 'outlined' },
        { label: 'Trust model docs', path: '/docs/conceptspace#what-to-build-on', variant: 'outlined' },
        { label: 'Go to the attester GitHub repo', href: 'https://gitlab.com/AdamSpitz/commonality/-/tree/main/implication-attester', variant: 'outlined' },
        { label: 'Go to the finder GitHub repo', href: 'https://gitlab.com/AdamSpitz/commonality/-/tree/main/implication-finder', variant: 'outlined' },
        { label: 'Go to the sample nudger GitHub repo', href: 'https://gitlab.com/AdamSpitz/commonality/-/tree/main/implication-graph-nudger', variant: 'outlined' },
      ]}
      spotlights={[
        {
          label: 'Deliberately boring',
          text: "There's exactly one concept here, and it doesn't constrain you in any way. It barely needs to be its own site — it's here only because lots of applications need the same small thing, and none of them should have to build it from scratch.",
        },
        {
          label: 'Use AI to reduce the need for coordination',
          text: "AI-driven services find statements that mean the same thing; use your own if you don't trust ours",
        },
        {
          label: 'Link to concepts',
          text: 'Point at a statement that means what you want, without worrying about whether someone else might phrase it in a different way',
        },
      ]}
      sections={sections}
    />
  )
}
