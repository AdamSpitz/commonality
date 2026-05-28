import { CSM_MISSION_STATEMENT_CID, CSM_MISSION_STATEMENT_TEXT } from '@commonality/sdk'
import { DomainLandingPage } from '../components/DomainLandingPage'

const missionStatementTallyPath = `/statement/${CSM_MISSION_STATEMENT_CID}`
const missionStatementAlignmentPath = `/portal/${CSM_MISSION_STATEMENT_CID}`

const sections = [
  {
    eyebrow: 'Canonical statement',
    title: 'View or sign the CSM mission statement',
    description: CSM_MISSION_STATEMENT_TEXT,
    domain: 'tally' as const,
    path: missionStatementTallyPath,
    cta: 'Open in Tally',
  },
  {
    eyebrow: 'Funding surface',
    title: 'Browse work aligned with that statement',
    description:
      'Alignment uses the mission statement as the cause root for CSM-aligned projects, content, and organizing work. Follow the statement portal to see what trusted attesters say is aligned with it.',
    domain: 'alignment' as const,
    path: missionStatementAlignmentPath,
    cta: 'Open in Alignment',
  },
  {
    eyebrow: 'Docs',
    title: 'Read the mission in context',
    description:
      'The CSM docs explain why the quiet middle majority is hard to see, why previous moderate movements failed, and how Tally plus Alignment make the mission actionable.',
    path: '/docs/common-sense-majority/mission-statement',
    cta: 'Read the mission statement',
  },
]

export function CsmLandingPage() {
  return (
    <DomainLandingPage
      title="The sane majority needs infrastructure"
      description="Neutral, uncapturable, and built to put money and a megaphone behind the calm voices instead of the crazy ones. CSM starts from one canonical mission statement, then uses Tally to make support visible and Alignment to fund work that serves it."
      heroActions={[
        { label: 'View/sign the mission statement', domain: 'tally', path: missionStatementTallyPath },
        { label: 'Browse mission-aligned work', domain: 'alignment', path: missionStatementAlignmentPath, variant: 'outlined' },
        { label: 'Read the mission', path: '/docs/common-sense-majority/mission-statement', variant: 'outlined' },
      ]}
      spotlights={[
        {
          label: 'The mission statement',
          text: CSM_MISSION_STATEMENT_TEXT,
        },
        {
          label: "AI reads the other side's bullshit so you don't have to",
          text: 'None of us has the patience to wade through millions of posts from the people we disagree with. The mediator reads what both sides actually wrote, surfaces where you already agree, and nudges everyone toward common ground that was already there.',
        },
        {
          label: 'Sanity needs a megaphone',
          text: 'Calm, persuasive content does not go viral on its own. The movement crowdfunds noninflammatory social-media content built to travel across the divide — so money and distribution are part of the flywheel, not an afterthought.',
        },
      ]}
      sections={sections}
    />
  )
}
