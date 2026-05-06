import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    title: 'How does counting indirect support work?',
    description:
      'People sign statements in their own words. An AI implication service finds statements that clearly imply each other — for example, "I support universal background checks for gun purchases" clearly implies "I think gun purchases should be regulated." Those signers get counted together, even though they used different words.',
  },
  {
    title: 'The AI is extremely conservative',
    description:
      '"I want to reduce gun violence" does NOT imply any particular policy position — too ambiguous. If there\'s any doubt at all, the attester says no. The point is to find genuine overlap, not to manufacture it.',
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
      spotlights={[
        {
          label: 'No need to compromise',
          text: 'Sign statements of what you believe, using exactly the wording you want',
        },
        {
          label: 'Count up direct and indirect support',
          text: 'See how many agree, even if they used different words to say it',
        },
      ]}
      sections={sections}
    />
  )
}
