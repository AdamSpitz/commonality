import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { CauseBoard } from '@ui/fundingportals'
import { TrustNetworkRefreshIndicator } from '@ui/shared'
import { AlignmentTrustGate } from './AlignmentTrustGate'
import { ConnectWalletHint } from './ConnectWalletHint'
import { HeaderInfoTip } from '../../shared'
import { StarterNetworkFilterCopy } from './StarterNetworkFilterNotice'
import { useAlignmentTrust } from '../hooks/useAlignmentTrust'
import { useUserStatements } from '../hooks/useUserStatements'

const sectionHeadingSx = { fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' } }

export const PERSONAL_DASHBOARD_PATH = '/dashboard'
const HOME_PREVIEW_LIMIT = 3

export function YourDashboard({
  layout = 'preview',
}: {
  layout?: 'preview' | 'page'
}) {
  const { statements, loading, connected, error, refresh } = useUserStatements()
  const {
    trustedAlignmentAttesters,
    alignmentTrustUnavailable,
    showInitialTrustLoad,
    trustError,
  } = useAlignmentTrust()
  const statementCids = statements.map((row) => row.cid).filter(Boolean)

  const preview = layout === 'preview'
  const headingId = preview ? 'home-dashboard-board' : 'personal-dashboard-page'

  return (
    <Stack spacing={1.5} data-testid={headingId}>
      <Stack direction="row" alignItems="center" flexWrap="wrap" useFlexGap spacing={1}>
        <Typography variant="h4" component={preview ? 'h2' : 'h1'} sx={sectionHeadingSx}>
          Fundable projects
        </Typography>
        <HeaderInfoTip
          title="Projects vouched for as advancing statements this wallet has signed."
          label="About your fundable-projects board"
        />
      </Stack>

      {!connected && (
        <ConnectWalletHint>
          Connect a wallet to see fundable projects vouched for as advancing statements you have signed.
        </ConnectWalletHint>
      )}

      {connected && loading && (
        <Stack direction="row" spacing={1} alignItems="center" data-testid="home-dashboard-loading">
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Loading signed statements…
          </Typography>
        </Stack>
      )}

      {connected && !loading && error && (
        <Alert severity="error" sx={{ borderRadius: 2 }} data-testid="home-dashboard-error">
          {error}
          <Button onClick={refresh} sx={{ display: 'block', mt: 0.5, textTransform: 'none', px: 0 }}>
            Try again
          </Button>
        </Alert>
      )}

      {connected && !loading && !error && statementCids.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: 2 }} data-testid="home-dashboard-empty">
          Sign a statement from a cause board or a statement page. This list is the union of
          work vouched as advancing those claims — it is not a private cause.
        </Alert>
      )}

      {connected && !loading && !error && statementCids.length > 0 && (
        <>
          {showInitialTrustLoad && (
            <Box sx={{ position: 'relative', height: 0 }}>
              <TrustNetworkRefreshIndicator title="Refreshing your trust network before listing projects." />
            </Box>
          )}
          {(trustError || alignmentTrustUnavailable) && (
            <AlignmentTrustGate error={trustError} />
          )}
          <CauseBoard
            statementCids={statementCids}
            trustedAlignmentAttesters={trustedAlignmentAttesters}
            embedded
            surfaceTitle="Fundable Projects"
            projectLinks="local"
            preview={
              preview
                ? { limit: HOME_PREVIEW_LIMIT, fullPageTo: PERSONAL_DASHBOARD_PATH }
                : undefined
            }
            projectsHelp={
              preview ? undefined : (
              <Stack spacing={1}>
                <Typography variant="body2">
                  Union of projects vouched as advancing any statement you signed. Alignment
                  attaches to a statement, never to a cause board as a club.
                </Typography>
                <StarterNetworkFilterCopy />
              </Stack>
              )
            }
          />
        </>
      )}
    </Stack>
  )
}
