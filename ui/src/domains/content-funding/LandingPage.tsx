import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    title: 'Who decides if content qualifies?',
    description:
      'AI does the bulk of the legwork — flagging content that appears to meet the criterion. But the final say is always yours, or whoever you personally chose as a trusted delegate. No third party can make funding decisions on your behalf unless you explicitly appointed them.',
  },
  {
    title: 'What does a content contract look like?',
    description:
      'A contract names a criterion (e.g. "noninflammatory political commentary"), a target platform (X, YouTube, or Substack), a reward per qualifying piece, and a total budget. Once the budget is pledged, creators who meet the criterion get paid automatically when their content is attested as qualifying.',
  },
  {
    title: "What stops people from gaming it?",
    description:
      "Attesters — the people (or AI services) who judge whether content qualifies — build a public track record. If an attester consistently approves junk, donors stop trusting them and route their pledges through someone else. Reputation is the enforcement mechanism.",
  },
]

export function ContentFundingLandingPage() {
  return (
    <DomainLandingPage
      title="Fund the kind of social-media content you want to see"
      description="funny, educational, investigative, noninflammatory — you name the criterion"
      heroActions={[
        { label: 'Browse (X/YouTube/Substack) creators', path: '/content' },
        { label: 'Create a content contract', path: '/content/new', variant: 'outlined' },
        { label: 'View a channel', path: '/content', variant: 'outlined' },
        { label: 'I am a content creator', path: '/content/dashboard', variant: 'outlined' },
        { label: 'Explore kinds of content', path: '/explore', variant: 'outlined' },
      ]}
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
      sections={sections}
    />
  )
}
