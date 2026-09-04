import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { Box, Card, CardActionArea, CardContent, CircularProgress, Stack, Typography } from '@mui/material'
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
    <Stack spacing={{ xs: 3, sm: 4 }} data-testid="home-dashboard">
      <Box sx={{ maxWidth: 680 }}>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 850, fontSize: { xs: '2rem', sm: '2.7rem' }, letterSpacing: '-0.035em' }}>
          What would you like to do?
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1.25, fontSize: { sm: '1.05rem' } }}>
          Choose a job. Each workspace stays focused, and you can come back here whenever you want to switch roles.
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
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
            : <Typography variant="body2" color="text.secondary">Set the scope of your personal funding board.</Typography>}
          action={fundingBoard ? 'Review projects' : 'Set up your funding board'}
        />
        <RoleCard
          title="Organize"
          to="/causes"
          description="Create and manage projects, publish cause boards, and help people coordinate around shared work."
          loading={causesLoading || (isConnected && projectsLoading)}
          summary={causes.length > 0 || createdProjects > 0
            ? <Typography variant="body2" sx={{ fontWeight: 700 }}>{countLabel(causes.length, 'cause board')} · {countLabel(createdProjects, 'created project')}</Typography>
            : <Typography variant="body2" color="text.secondary">Turn a useful idea into something other people can join.</Typography>}
          action={causes.length > 0 || createdProjects > 0 ? 'Continue organizing' : 'Start organizing'}
        />
      </Box>
    </Stack>
  )
}
