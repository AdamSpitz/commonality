import { DomainLandingPage } from '../components/DomainLandingPage'

export function ContentFundingLandingPage() {
  return (
    <DomainLandingPage
      title="Fund the kind of social-media content you want to see"
      description="funny, educational, investigative, noninflammatory — you name the criterion"
      spotlights={[
        {
          label: 'Base funding on criteria other than eyeballs',
          text: 'Reward exactly the criteria you want (unlike ads, which reward clickbait and outrage)',
        },
        {
          label: 'Works with mainstream social media',
          text: "Works with X, YouTube, and Substack — fund creators you like even if they haven't registered here yet",
        },
      ]}
    />
  )
}
