import { DomainLandingPage } from '../components/DomainLandingPage'

const sections = [
  {
    title: 'The number nobody else can produce',
    description:
      'A statement page shows "50,000 direct signers, 2 million indirect supporters" — people who never coordinated, never compromised on wording, but were all independently saying the same thing. Polls only count the options pollsters chose; petitions only count one exact wording. This is bottom-up agreement, aggregated across millions of people\'s own words.',
    path: '/popular-statements',
    cta: 'See popular statements',
  },
  {
    title: 'The same statement, both sides',
    description:
      '"Break up the big tech platforms" — signed on the left over monopoly power and on the right over censorship. Same statement, different reasons. You sign your own words; the system finds everyone else who already agrees in language that looked nothing like yours.',
  },
  {
    title: 'How does it actually work?',
    description:
      'Scattered people sign statements in their own words. AI discovers which ones imply the same common ground and nudges both sides toward it. Crowdfunded noninflammatory content carries those bridges across the divide. The full walkthrough has the details.',
    path: '/about',
    cta: 'Read the walkthrough',
  },
]

export function CsmLandingPage() {
  return (
    <DomainLandingPage
      title="The sane majority needs infrastructure"
      description="Neutral, uncapturable, and built to put money and a megaphone behind the calm voices instead of the crazy ones. The AI does the tedious part — reading the other side so you don't have to, and finding the common ground that was already there."
      heroActions={[
        { label: 'See what the majority already agrees on', path: '/popular-statements' },
        { label: 'How it works', path: '/about', variant: 'outlined' },
        { label: 'CSM nudgers', path: '/organize', variant: 'outlined' },
      ]}
      spotlights={[
        {
          label: "AI reads the other side's bullshit so you don't have to",
          text: 'None of us has the patience to wade through millions of posts from the people we disagree with. The AI does — it reads what both sides actually wrote, surfaces where you already agree, and nudges everyone toward the common ground that was already there.',
        },
        {
          label: 'Sanity needs a megaphone',
          text: 'Calm, persuasive content does not go viral on its own. The movement crowdfunds noninflammatory social-media content built to travel across the divide — so money and distribution are part of the flywheel, not an afterthought.',
        },
        {
          label: "Neutral infrastructure",
          text: 'Moderate movements fail because both sides suspect the organizer is working for the other side. There is no organizer here. Open prompts you can read, money on a blockchain, nothing to capture or bribe.',
        },
      ]}
      sections={sections}
    />
  )
}
