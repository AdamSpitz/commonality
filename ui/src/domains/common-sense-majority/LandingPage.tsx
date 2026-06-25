import { useState } from 'react'
import { CSM_MISSION_STATEMENT_CID, CSM_MISSION_STATEMENT_TEXT } from '@commonality/sdk/conceptspace'
import { Alert, Button, Chip, FormControlLabel, Paper, Stack, Switch, Typography } from '@mui/material'
import { landingHeroContainedButtonSx } from '../../shared'
import { DomainLandingPage } from '../components/DomainLandingPage'
import { getDomainUrl } from '../../shared'
import { getCsmMediatorNudger, getTallyMediatorOptInPath } from '../../shared'
import {
  addTrustedNudger,
  isTrustedNudger,
  loadTrustedNudgers,
  removeTrustedNudger,
  type TrustedNudgerEntry,
} from '../../shared'

const missionStatementAlignmentPath = `/portal/${CSM_MISSION_STATEMENT_CID}`

function getTallyNudgerPath(mediator: TrustedNudgerEntry | null): string {
  return mediator ? getTallyMediatorOptInPath(mediator) : '/settings'
}

function mediatorName(mediator: TrustedNudgerEntry): string {
  return mediator.name ?? 'Common Sense Majority mediator'
}

function CsmMediatorOptInControl({ mediator }: { mediator: TrustedNudgerEntry | null }) {
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
    <Paper
      id="mediator-opt-in"
      component="section"
      aria-labelledby="csm-mediator-opt-in-heading"
      sx={(theme) => ({
        p: 2.5,
        borderRadius: 3,
        bgcolor: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.88)' : 'rgba(15, 23, 42, 0.76)',
        color: theme.palette.mode === 'light' ? '#14213d' : theme.palette.text.primary,
        border: '1px solid',
        borderColor: theme.palette.mode === 'light' ? 'rgba(20, 33, 61, 0.10)' : 'rgba(148, 163, 184, 0.24)',
        maxWidth: 820,
      })}
    >
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
          <Typography id="csm-mediator-opt-in-heading" variant="h6" sx={{ color: 'inherit', fontWeight: 700 }}>
            Opt in to the CSM mediator
          </Typography>
          <Chip color={optedIn ? 'success' : 'default'} label={optedIn ? 'Opted in' : 'Off by default'} />
        </Stack>
        <Typography variant="body2" sx={{ color: 'inherit', maxWidth: 720 }}>
          This just adds {mediatorName(mediator)} to your trusted nudgers. The only consequence is that Tally may show you suggestions for statements you might be willing to sign. You are not agreeing to sign anything, and you can turn it back off anytime.
        </Typography>
        <FormControlLabel
          control={<Switch checked={optedIn} onChange={handleToggle} />}
          label={optedIn ? 'Showing mediator suggestions' : 'Not showing mediator suggestions'}
          sx={{ color: 'inherit' }}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button component="a" href={tallyOptInHref} variant="contained" color="inherit" sx={landingHeroContainedButtonSx}>
            {optedIn ? 'Open Tally with mediator enabled' : 'Opt in on Tally'}
          </Button>
          <Button component="a" href={optedIn ? tallyStatementsHref : tallySettingsHref} variant="outlined" color="inherit">
            {optedIn ? 'View Tally statements' : 'Manage nudgers'}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
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
        { label: 'Enable mediator suggestions in Tally', domain: 'tally', path: tallyNudgerPath },
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
