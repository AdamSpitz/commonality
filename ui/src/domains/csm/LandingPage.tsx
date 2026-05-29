import { useState } from 'react'
import { CSM_MISSION_STATEMENT_CID, CSM_MISSION_STATEMENT_TEXT } from '@commonality/sdk'
import { Alert, Button, Chip, FormControlLabel, Paper, Stack, Switch, Typography } from '@mui/material'
import { DomainLandingPage } from '../components/DomainLandingPage'
import { getDomainUrl } from '../domainUrls'
import { getCsmMediatorNudger, getTallyMediatorOptInPath } from '../../shared/csmMediatorNudger'
import {
  addTrustedNudger,
  isTrustedNudger,
  loadTrustedNudgers,
  removeTrustedNudger,
  type TrustedNudgerEntry,
} from '../../shared/hooks/useTrustedNudgers'

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

function mediatorName(mediator: TrustedNudgerEntry): string {
  return mediator.name ?? 'Common Sense Majority mediator'
}

function CsmMediatorOptInControl() {
  const mediator = getCsmMediatorNudger()
  const [trustedNudgers, setTrustedNudgers] = useState(loadTrustedNudgers)

  if (!mediator) {
    return (
      <Alert severity="info" sx={{ maxWidth: 780 }}>
        The CSM mediator nudger is not configured for this deployment yet. You can still use Tally directly; mediator suggestions will appear here once an operator configures <code>VITE_CSM_MEDIATOR_NUDGER</code>.
      </Alert>
    )
  }

  const optedIn = isTrustedNudger(mediator.address, trustedNudgers)
  const tallyOptInHref = getDomainUrl('tally', getTallyMediatorOptInPath(mediator))
  const tallyStatementsHref = getDomainUrl('tally', '/statements')
  const tallySettingsHref = getDomainUrl('tally', '/settings')

  const handleToggle = () => {
    setTrustedNudgers(optedIn ? removeTrustedNudger(mediator.address) : addTrustedNudger(mediator))
  }

  return (
    <Paper id="mediator-opt-in" sx={{ p: 2.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.88)', maxWidth: 820 }}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
          <Typography variant="h6" sx={{ color: '#14213d', fontWeight: 700 }}>
            Opt in to the CSM mediator
          </Typography>
          <Chip color={optedIn ? 'success' : 'default'} label={optedIn ? 'Opted in' : 'Off by default'} />
        </Stack>
        <Typography variant="body2" sx={{ color: '#14213d', maxWidth: 720 }}>
          This just adds {mediatorName(mediator)} to your trusted nudgers. The only consequence is that Tally may show you suggestions for statements you might be willing to sign. You are not agreeing to sign anything, and you can turn it back off anytime.
        </Typography>
        <FormControlLabel
          control={<Switch checked={optedIn} onChange={handleToggle} />}
          label={optedIn ? 'Listen to mediator suggestions' : 'Do not show mediator suggestions'}
          sx={{ color: '#14213d' }}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button component="a" href={tallyOptInHref} variant="contained" sx={{ bgcolor: '#14213d', '&:hover': { bgcolor: '#0f172a' } }}>
            {optedIn ? 'Open Tally with mediator enabled' : 'Opt in on Tally'}
          </Button>
          <Button component="a" href={optedIn ? tallyStatementsHref : tallySettingsHref} variant="outlined" sx={{ color: '#14213d', borderColor: '#14213d' }}>
            {optedIn ? 'View Tally statements' : 'Manage nudgers'}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
}

export function CsmLandingPage() {
  return (
    <DomainLandingPage
      title="The sane majority needs infrastructure"
      description="Neutral, uncapturable, and built to put money and a megaphone behind the calm voices instead of the crazy ones. CSM starts from one canonical mission statement, then uses Tally to make support visible and Alignment to fund work that serves it."
      heroChildren={<CsmMediatorOptInControl />}
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
