import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    title: 'What an implication looks like',
    description:
      '"Public libraries should keep extended evening hours" clearly implies "public libraries should stay open." An attester records that arrow, so a vote for the specific statement also counts toward the general one — without anyone agreeing on a single canonical wording.',
  },
  {
    title: 'Implication, not equivalence',
    description:
      "The two statements don't have to mean the same thing. One just has to clearly imply the other. If there's real doubt, the attester declines — a vague statement like \"libraries matter\" implies nothing in particular.",
  },
]

export function ConceptspaceLandingPage() {
  return (
    <DomainLandingPage
      title="Make concepts linkable"
      description="The same idea gets phrased a dozen different ways. Conceptspace lets you point at the concept instead of the exact words. That's the whole thing: one small primitive — an implication arrow from one statement to another. It's plumbing, not a product, it doesn't lock you into anything, and it's here only so no application has to reinvent it."
      heroActions={[
        { label: 'Read the developer docs', path: '/docs/conceptspace' },
        { label: 'API and SDK docs', path: '/docs/conceptspace#api-and-contract-reference', variant: 'outlined' },
      ]}
      spotlights={[
        {
          label: 'Count concepts, not strings',
          text: "If you tally support for an exact wording, you fragment it across near-duplicates. An implication arrow says one statement implies another, so a dozen phrasings can all count toward the same idea.",
        },
        {
          label: 'Deliberately boring',
          text: "There's exactly one concept here, and it doesn't constrain you in any way. It barely needs to be its own site — it's here only because lots of applications need the same small thing, and none of them should have to build it from scratch.",
        },
        {
          label: 'You choose whom to trust',
          text: "Implications are published by attesters, found with help from AI. The graph is open: pick which attesters' judgments count, or run your own. Nothing here is centrally authoritative.",
        },
      ]}
      sections={sections}
    />
  )
}
