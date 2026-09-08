import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { Box, Button, Card, CardActionArea, CardContent, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useDonationSummary } from '../hooks/useDonationSummary'
import { useUserCauses } from '../hooks/useUserCauses'
import { useUserProjects } from '../hooks/useUserProjects'
import { useUserStatements } from '../hooks/useUserStatements'
import { readPersonalFundingBoard } from '../lib/personalFundingBoard'

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function RoleCard({ title, to, description, summary, action, loading }: {
  title: string
  to: string
  description: string
  summary: ReactNode
  action: string
  loading?: boolean
}) {
  return (
    <Card variant="outlined" sx={{ height: '100%', borderRadius: 3 }}>
      <CardActionArea data-testid={`home-role-${title.toLowerCase()}`} component={RouterLink} to={to} sx={{ height: '100%', alignItems: 'stretch' }}>
        <CardContent sx={{ p: { xs: 2.25, sm: 3 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 800 }}>{title}</Typography>
          <Typography color="text.secondary" sx={{ mt: 1, lineHeight: 1.55 }}>{description}</Typography>
          <Box sx={{ mt: 2, mb: 2, minHeight: 24 }}>
            {loading ? <CircularProgress size={18} /> : summary}
          </Box>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 'auto', color: 'primary.main' }}>
            <Typography variant="body2" sx={{ fontWeight: 750 }}>{action}</Typography>
            <ArrowForwardIcon sx={{ fontSize: 17 }} />
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

export function HomePage() {
  const { isConnected, address } = useAccount()
  const { statements, loading: statementsLoading } = useUserStatements()
  const { projects, loading: projectsLoading } = useUserProjects()
  const { causes, loading: causesLoading } = useUserCauses()
  const donation = useDonationSummary()
  const createdProjects = projects.filter((project) => project.relations.includes('created')).length
  const hasDonateActivity = donation.activePledgeCount > 0 || donation.activeNoteCount > 0
  const fundingBoard = readPersonalFundingBoard(address)

  return (
    <Stack spacing={{ xs: 3, sm: 4 }} data-testid="home-landing">
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          background: (theme) =>
            theme.palette.mode === 'light'
              ? 'linear-gradient(160deg, rgba(15,118,110,0.10) 0%, rgba(255,252,247,0.95) 55%, #fff 100%)'
              : 'linear-gradient(160deg, rgba(45,212,191,0.14) 0%, rgba(15,23,42,0.9) 60%, #0b1220 100%)',
        }}
      >
        <Typography variant="overline" sx={{ letterSpacing: '0.14em', fontWeight: 700, color: 'primary.main' }}>
          CauseStarter
        </Typography>
        <Typography
          variant="h3"
          component="h1"
          sx={{
            mt: 0.5,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            fontSize: { xs: '1.85rem', sm: '2.35rem' },
            lineHeight: 1.15,
          }}
        >
          There are enough of us. We just couldn’t work together.
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5, maxWidth: 640 }}>
          A cause board is a bulletin of crowdfundable projects: raise a specific
          amount by a date to do a specific piece of work. If the crowd doesn’t
          show, contributors get their money back. That is a third way besides
          “government does it” and “a big charity does it.”
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1.25, maxWidth: 640 }}>
          You do not have to watch the board — pledge a monthly amount to someone
          you already trust. You do not have to bet on pitches — reimburse work
          that already delivered. Signing a statement does not spend money.
        </Typography>

        <Button
          component={RouterLink}
          to="/docs"
          sx={{ mt: 2, px: 0, textTransform: 'none', fontWeight: 700 }}
        >
          Read the short version
        </Button>
      </Paper>

      <Box>
        <Typography variant="h4" component="h2" sx={{ fontWeight: 850, fontSize: { xs: '1.45rem', sm: '1.75rem' }, letterSpacing: '-0.03em' }}>
          What would you like to do?
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 2, maxWidth: 680, fontSize: { sm: '1.05rem' } }}>
          Money, judgment, skilled work, and organizing do not have to arrive in
          one organization. Pick the job you would do anyway. Come back here to
          switch.
        </Typography>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }} data-testid="home-dashboard">
          <RoleCard
            title="Sign"
            to="/statements"
            description="Express what you believe, improve the wording, and discover common ground. Signing does not commit money."
            loading={isConnected && statementsLoading}
            summary={isConnected && statements.length > 0
              ? <Typography variant="body2" sx={{ fontWeight: 700 }}>{countLabel(statements.length, 'signed statement')}</Typography>
              : <Typography variant="body2" color="text.secondary">Find a statement worth standing behind.</Typography>}
            action={statements.length > 0 ? 'Continue signing' : 'Explore statements'}
          />
          <RoleCard
            title="Donate"
            to="/donate"
            description="Pledge money to a cause, entrust it to someone you trust, and check what your money has done."
            loading={isConnected && donation.loading}
            summary={hasDonateActivity
              ? <Typography variant="body2" sx={{ fontWeight: 700 }}>{countLabel(donation.activePledgeCount, 'monthly pledge')} · {countLabel(donation.activeNoteCount, 'active fund')}</Typography>
              : <Typography variant="body2" color="text.secondary">Set up giving that does not need your daily attention.</Typography>}
            action={hasDonateActivity ? 'Manage donations' : 'Set up a donation'}
          />
          <RoleCard
            title="Fund"
            to="/dashboard"
            description="Review relevant projects and actively decide where available money should go."
            loading={isConnected && statementsLoading}
            summary={fundingBoard
              ? <Typography variant="body2" sx={{ fontWeight: 700 }}>{countLabel(fundingBoard.statementCids.length, 'statement')} in your board{fundingBoard.geographicWithin?.length ? ` · ${fundingBoard.geographicWithin.join(', ')}` : ''}</Typography>
              : statements.length > 0
                ? <Typography variant="body2" sx={{ fontWeight: 700 }}>{countLabel(statements.length, 'signed statement')} (default board)</Typography>
                : <Typography variant="body2" color="text.secondary">Set the scope of your personal funding board.</Typography>}
            action={fundingBoard || statements.length > 0 ? 'Review projects' : 'Set up your funding board'}
          />
          <RoleCard
            title="Work"
            to="/work"
            description="Create a project, follow the ones you started, and keep a shared bookmark list of work you care about."
            loading={isConnected && projectsLoading}
            summary={createdProjects > 0
              ? <Typography variant="body2" sx={{ fontWeight: 700 }}>{countLabel(createdProjects, 'created project')}</Typography>
              : <Typography variant="body2" color="text.secondary">Publish a piece of work people can fund.</Typography>}
            action={createdProjects > 0 ? 'Continue your work' : 'Start a project'}
          />
          <RoleCard
            title="Organize"
            to="/causes"
            description="Publish cause boards and help people coordinate around shared statements."
            loading={causesLoading}
            summary={causes.length > 0
              ? <Typography variant="body2" sx={{ fontWeight: 700 }}>{countLabel(causes.length, 'cause board')}</Typography>
              : <Typography variant="body2" color="text.secondary">Turn a useful mix of statements into a board people can share.</Typography>}
            action={causes.length > 0 ? 'Continue organizing' : 'Start organizing'}
          />
        </Box>
      </Box>

      <Button
        component={RouterLink}
        to="/profile"
        data-testid="home-profile-link"
        sx={{ alignSelf: 'flex-start', px: 0, textTransform: 'none', fontWeight: 700 }}
      >
        See what you’ve done
      </Button>
    </Stack>
  )
}
