import { DomainLandingPage } from '../components/DomainLandingPage'

export function ConceptspaceLandingPage() {
  return (
    <DomainLandingPage
      title="Make concepts linkable"
      description="Infrastructure that removes the need to coordinate on exactly how an idea is phrased"
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
