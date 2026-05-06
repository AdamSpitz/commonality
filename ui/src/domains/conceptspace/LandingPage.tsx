import { DomainLandingPage } from '../components/DomainLandingPage'

export function ConceptspaceLandingPage() {
  return (
    <DomainLandingPage
      title="Make concepts linkable"
      description="Infrastructure that removes the need to coordinate on exactly how an idea is phrased"
      heroActions={[
        { label: 'Go to the attester GitHub repo', href: 'https://gitlab.com/AdamSpitz/commonality/-/tree/main/implication-attester' },
        { label: 'Go to the finder GitHub repo', href: 'https://gitlab.com/AdamSpitz/commonality/-/tree/main/implication-finder', variant: 'outlined' },
        { label: 'Go to the sample nudger GitHub repo', href: 'https://gitlab.com/AdamSpitz/commonality/-/tree/main/implication-graph-nudger', variant: 'outlined' },
      ]}
      spotlights={[
        {
          label: 'Use AI to reduce the need for coordination',
          text: "AI-driven services find statements that mean the same thing; use your own if you don't trust ours",
        },
        {
          label: 'Link to concepts',
          text: 'Point at a statement that means what you want, without worrying about whether someone else might phrase it in a different way',
        },
      ]}
    />
  )
}
