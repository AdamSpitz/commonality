import { DomainLandingPage } from '../components/DomainLandingPage'

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
    />
  )
}
