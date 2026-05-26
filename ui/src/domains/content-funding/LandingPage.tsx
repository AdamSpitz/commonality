import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    title: 'Who decides if content qualifies?',
    description:
      'AI and trusted attesters can help flag whether a specific post, video, or essay matches the contract. Cause-level browsing and statement-centric funding portals live on Alignment; this site stays focused on creator and channel contracts.',
  },
  {
    title: 'What does a content contract look like?',
    description:
      'A contract is tied to a creator channel on X, YouTube, or Substack, may cover specific posts/videos/essays, and uses LazyGiving-style escrow so supporters can pool funds for the creator to claim.'
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
      description="Fund creators, channels, and specific pieces of work on mainstream social platforms."
      heroActions={[
        { label: 'Browse (X/YouTube/Substack) creators', path: '/content' },
        { label: 'Create a content contract', path: '/content/new', variant: 'outlined' },
        { label: 'View a channel', path: '/content', variant: 'outlined' },
        { label: 'I am a content creator', path: '/content/dashboard', variant: 'outlined' },
        { label: 'Criteria vs. cause portals', path: '/explore', variant: 'outlined' },
      ]}
      spotlights={[
        {
          label: 'Base funding on criteria other than eyeballs',
          text: 'Reward posts, videos, essays, and channels directly, instead of relying on ad incentives that reward clickbait and outrage',
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
