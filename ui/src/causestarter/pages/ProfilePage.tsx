import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { AddressDisplay } from '../../shared'
import { CauseCard } from '../components/CauseCard'
import { ConnectWalletHint } from '../components/ConnectWalletHint'
import { YourProjects } from '../components/YourProjects'
import { useDonationSummary } from '../hooks/useDonationSummary'
import { useUserAlignments } from '../hooks/useUserAlignments'
import { useUserCauses } from '../hooks/useUserCauses'
import { useUserProjects } from '../hooks/useUserProjects'
import { useUserStatements } from '../hooks/useUserStatements'
import { isLive } from '../lib/causeStore'

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function paddedAddressSubject(subjectId: string): string | null {
  const hex = subjectId.toLowerCase().replace(/^0x/, '')
  if (hex.length !== 64 || !hex.startsWith('0'.repeat(24))) return null
  return `0x${hex.slice(24)}`
}

export function ProfilePage() {
  const { address, isConnected } = useAccount()
  const donation = useDonationSummary()
  const { projects, loading: projectsLoading, connected } = useUserProjects()
  const { statements, loading: statementsLoading, error: statementsError } = useUserStatements()
  const { causes, loading: causesLoading } = useUserCauses()
  const { attestations, loading: alignmentsLoading, error: alignmentsError, refresh: refreshAlignments } = useUserAlignments()

  const contributed = projects.filter((project) => project.relations.includes('contributed'))
  const created = projects.filter((project) => project.relations.includes('created'))
  const addressLc = address?.toLowerCase()
  const organized = causes.filter((cause) => isLive(cause) && cause.founderAddress?.toLowerCase() === addressLc)

  return (
    <Stack spacing={3} data-testid="profile-page">
      <Box>
        <Typography
          variant="overline"
          sx={{ letterSpacing: '0.14em', fontWeight: 700, color: 'primary.main' }}
        >
          Profile
        </Typography>
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' } }}
        >
          Stuff you’ve done
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 560 }}>
          This is a record for this wallet, not a workspace. Home is for what you
          could do next. Signing, donating, funding, working, and organizing stay
          in their own places.
        </Typography>
        {address && (
          <Box sx={{ mt: 1.25 }}>
            <AddressDisplay address={address} />
          </Box>
        )}
      </Box>

      {!isConnected && (
        <ConnectWalletHint>Connect a wallet to see pledges, receipts, causes, signatures, and attestations on this device.</ConnectWalletHint>
      )}

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }} data-testid="profile-giving">
        <Typography variant="h6" component="h2" sx={{ fontWeight: 750 }}>Giving</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Monthly pledges and funds you still have open. The Donate workspace is
          where you change them.
        </Typography>
        {donation.loading ? (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">Loading giving…</Typography>
          </Stack>
        ) : (
          <Typography variant="body2" sx={{ mt: 1.25, fontWeight: 700 }}>
            {countLabel(donation.activePledgeCount, 'monthly pledge')} · {countLabel(donation.activeNoteCount, 'active fund')}
          </Typography>
        )}
        <Button component={RouterLink} to="/donate" sx={{ mt: 1, px: 0 }}>Open Donate</Button>
      </Paper>

      <YourProjects
        heading="Projects with receipts"
        empty="No contribution receipts on this wallet yet. Funding a project in Fund or Donate leaves a receipt here."
        projects={contributed}
        loading={projectsLoading}
        connected={connected}
        mode="fund"
        testId="profile-contributed-projects"
        connectHint="Connect a wallet to see projects you contributed to."
        about="Projects this wallet has contributed to. The onchain receipt stays even after a project succeeds or is refunded."
      />

      <YourProjects
        heading="Projects you created"
        empty="No projects created with this wallet yet. Creating one lives in Work."
        projects={created}
        loading={projectsLoading}
        connected={connected}
        mode="work"
        testId="profile-created-projects"
        connectHint="Connect a wallet to see projects you created."
        about="Projects this wallet published. Managing them is still Work."
      />

      <Stack spacing={1.5} data-testid="profile-causes">
        <Typography variant="h4" component="h2" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
          Cause boards you published
        </Typography>
        {causesLoading && organized.length === 0 ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">Loading cause boards…</Typography>
          </Stack>
        ) : organized.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No published cause boards from this wallet on this device.
          </Typography>
        ) : (
          <Stack spacing={0.75}>
            {organized.map((cause) => <CauseCard key={cause.id} cause={cause} />)}
          </Stack>
        )}
        <Button component={RouterLink} to="/causes" sx={{ alignSelf: 'flex-start', px: 0 }}>Open Organize</Button>
      </Stack>

      <Stack spacing={1.5} data-testid="profile-statements">
        <Typography variant="h4" component="h2" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
          Statements you’ve signed
        </Typography>
        {statementsLoading && statements.length === 0 ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">Loading signed statements…</Typography>
          </Stack>
        ) : statementsError ? (
          <Alert severity="warning">{statementsError}</Alert>
        ) : statements.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No signed statements on this wallet yet.
          </Typography>
        ) : (
          <Stack spacing={0.75}>
            {statements.map((statement) => (
              <Button
                key={statement.cid}
                component={RouterLink}
                to={`/statement/${statement.cid}`}
                sx={{ justifyContent: 'flex-start', textTransform: 'none', px: 0, fontWeight: 600 }}
              >
                {statement.title?.trim() || statement.cid}
              </Button>
            ))}
          </Stack>
        )}
        <Button component={RouterLink} to="/statements" sx={{ alignSelf: 'flex-start', px: 0 }}>Open Sign</Button>
      </Stack>

      <Stack spacing={1.5} data-testid="profile-alignments">
        <Typography variant="h4" component="h2" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
          Alignment attestations
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Vouches this wallet made that a project advances a statement.
        </Typography>
        {alignmentsLoading && attestations.length === 0 ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">Loading attestations…</Typography>
          </Stack>
        ) : alignmentsError ? (
          <Alert severity="warning">
            {alignmentsError}
            <Button onClick={refreshAlignments} sx={{ display: 'block', mt: 0.5, textTransform: 'none', px: 0 }}>
              Try again
            </Button>
          </Alert>
        ) : attestations.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No alignment attestations from this wallet yet.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {attestations.map((attestation) => {
              const projectAddress = paddedAddressSubject(attestation.subjectId)
              return (
                <Paper key={`${attestation.subjectId}-${attestation.statementCid}`} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {projectAddress ? (
                      <Button component={RouterLink} to={`/projects/${projectAddress}`} sx={{ px: 0, textTransform: 'none' }}>
                        Project {projectAddress.slice(0, 10)}…
                      </Button>
                    ) : (
                      `Subject ${attestation.subjectId.slice(0, 12)}…`
                    )}
                  </Typography>
                  <Button
                    component={RouterLink}
                    to={`/statement/${attestation.statementCid}`}
                    sx={{ px: 0, textTransform: 'none' }}
                  >
                    Statement {attestation.statementCid.slice(0, 12)}…
                  </Button>
                </Paper>
              )
            })}
          </Stack>
        )}
      </Stack>
    </Stack>
  )
}
