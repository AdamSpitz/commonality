import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    title: 'How does the creator get paid?',
    description:
      "Creators claim their channel by posting a verification code from the account itself, which proves they control it. Anyone can start a contract for a creator who hasn't shown up yet; the funds wait in escrow for the creator and never go to the third party.",
  },
  {
    title: "What stops people from gaming it?",
    description:
      "Attesters — the people (or AI services) who judge whether content qualifies — build a public track record. If an attester consistently approves junk, donors stop trusting them and route their pledges through someone else. Reputation is the enforcement mechanism.",
  },
  {
    title: "Why not just ads — or paywalls, government, or Patreon?",
    description:
      "Content is non-excludable, so ads became the default way to make people 'pay' for it — but ads reward attention, not value, which pushes toward outrage and clickbait. The alternatives don't fit either: paywalls lock content away from the people it should reach, government and big charity are too coarse-grained and too capturable, and Patreon-style tipping can't coordinate 'I'll pay if enough others do.' This is crowdfunding built for the job — assurance contracts, delegation, and retroactive funding, at the fine grain social media needs.",
  },
]

export function ContentFundingLandingPage() {
  return (
    <DomainLandingPage
      title="Reward the content you're glad you saw"
      description="Put real money behind tweets, videos, and posts on X, YouTube, and Substack — reward work that already exists, commission work that doesn't yet, or fund a whole kind of content you want more of."
      heroActions={[
        { label: 'Browse creators', path: '/content' },
        { label: 'Get your content funded', path: '/content/dashboard', variant: 'outlined' },
        { label: 'Fund a kind of content', path: '/explore', variant: 'outlined' },
      ]}
      spotlights={[
        {
          label: 'Reward a post you loved',
          text: "Read a thread, watched a video, or read an essay that genuinely helped you? Put money behind it, not just a like. Supporters pool funds on the piece and the creator claims them — even a creator who's never heard of us yet.",
        },
        {
          label: "Commission a creator's next chapter",
          text: "Pledge toward a creator's next month of work as an assurance contract: you only pay if enough others pledge too, and you're refunded if the goal isn't met. The creator gets a guarantee before they start, and nobody risks anything.",
        },
        {
          label: 'Fund a whole kind of content',
          text: "Pledge toward a type of content you want more of — like writing that informs rather than inflames — and let it fund qualifying work, old or new. Powered by cause pools on Aligning; the Civility vertical is built this way.",
        },
      ]}
      sections={sections}
    />
  )
}
