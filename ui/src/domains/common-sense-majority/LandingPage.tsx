import { CSM_MISSION_STATEMENT_CID, CSM_MISSION_STATEMENT_TEXT } from '@commonality/sdk/conceptspace'
import { MediatorOptInBlock } from '../../shared'
import { DomainLandingPage } from '../components/DomainLandingPage'
import { getDomainUrl } from '../../shared'
import { getCsmMediatorNudger, getTallyMediatorOptInPath } from '../../shared'
import { buildCompleteBridgeCards, csmBridgeAnchors, getBridgeAnchorTallyPath, getSignableCommonGroundAnchors } from './csmBridges'
import type { TrustedNudgerEntry } from '../../shared'

const missionStatementAlignmentPath = `/portal/${CSM_MISSION_STATEMENT_CID}`

const signableCommonGroundAnchors = getSignableCommonGroundAnchors(buildCompleteBridgeCards(csmBridgeAnchors))
const primaryCommonGroundStatementPath = signableCommonGroundAnchors[0]
  ? getBridgeAnchorTallyPath(signableCommonGroundAnchors[0])
  : '/statements'

function getTallyNudgerPath(mediator: TrustedNudgerEntry | null): string {
  return mediator ? getTallyMediatorOptInPath(mediator) : '/settings'
}

function CsmMediatorOptInControl({ mediator }: { mediator: TrustedNudgerEntry | null }) {
  return <MediatorOptInBlock
    mediator={mediator}
    heading="Opt in to the CSM mediator"
    tallyUrl={(path) => getDomainUrl('tally', path)}
  />
}

export function CsmLandingPage() {
  const mediator = getCsmMediatorNudger()
  const tallyNudgerPath = getTallyNudgerPath(mediator)

  const sections = [
    {
      eyebrow: 'What is a bridge?',
      title: 'See common-ground bridges in action',
      description:
        'A bridge starts with two opposed-sounding positions, then shows the shared claim both sides may already accept. Browse concrete examples before opting in to mediator suggestions.',
      path: '/bridges',
      cta: 'Browse CSM bridges',
    },
    {
      eyebrow: 'After opt-in',
      title: 'View mediator suggestions in Tally',
      description:
        'Tally is where the CSM mediator can suggest statements you might be willing to sign. Open the nudger setup there so your statement-signing workflow actually listens to the mediator on the Tally domain.',
      domain: 'tally' as const,
      path: tallyNudgerPath,
      cta: 'Open Tally nudger setup',
    },
    {
      eyebrow: 'Content engine',
      title: 'Fund bridge-building media on Civility',
      description:
        'Civility is the content engine for CSM: it crowdfunds noninflammatory, persuasive media built to travel across the divide. Back the creators making the calm case, or claim funding for your own.',
      domain: 'civility' as const,
      path: '/',
      cta: 'Open Civility',
    },
    {
      eyebrow: 'Funding surface',
      title: 'Browse CSM-aligned causes and content',
      description:
        'Aligning uses the mission statement as the cause root for CSM-aligned projects, content, and organizing work. Follow the cause board to see what trusted attesters say is aligned with it.',
      domain: 'alignment' as const,
      path: missionStatementAlignmentPath,
      cta: 'Open the CSM cause board',
    },
  ]

  return (
    <DomainLandingPage
      title="The sane majority needs infrastructure"
      description="Neutral, uncapturable, and built to put money and a megaphone behind the calm voices instead of the crazy ones. CSM starts from one canonical mission statement, then uses Tally to make support visible and Aligning to fund work that serves it."
      heroChildren={<CsmMediatorOptInControl mediator={mediator} />}
      heroActions={[
        { label: 'Sign a common-ground statement', domain: 'tally', path: primaryCommonGroundStatementPath },
        { label: 'Enable mediator suggestions in Tally', domain: 'tally', path: tallyNudgerPath, variant: 'outlined' },
        { label: 'Browse CSM-aligned work', domain: 'alignment', path: missionStatementAlignmentPath, variant: 'outlined' },
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
