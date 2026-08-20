import { useMemo } from 'react'
import { Alert, Box, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useTrustedAttesters } from '@ui/shared'
import { ConnectWalletHint } from '../components/ConnectWalletHint'
import { HeaderInfoTip } from '../components/HeaderInfoTip'
import { StatementSupportStats } from '../components/StatementSupportStats'
import { SupportButton } from '../components/SupportButton'
import { useAlignmentTrust } from '../hooks/useAlignmentTrust'
import { useCauseProjects } from '../hooks/useCauseProjects'
import { useUserStatements } from '../hooks/useUserStatements'
import { useViewCounts } from '../hooks/useViewCounts'
import type { IpfsCidV1 } from '@commonality/sdk/utils'

export function StatementsPage() {
  const { statements, loading, connected, refresh } = useUserStatements()
  const trustedImplicationAttesters = useTrustedAttesters()
  const activeTrustedImplicationAttesters = trustedImplicationAttesters.length > 0
    ? trustedImplicationAttesters
    : undefined
  const { trustedAlignmentAttesters, alignmentTrustReady } = useAlignmentTrust()
  const statementCids = useMemo(() => statements.map((statement) => statement.cid), [statements])
  const { perPlank, loading: countsLoading, refresh: refreshCounts } = useViewCounts(
    statementCids,
    statementCids,
    activeTrustedImplicationAttesters,
    statementCids.length > 0,
  )
  const { countByPlankCid } = useCauseProjects(
    statementCids,
    activeTrustedImplicationAttesters,
    trustedAlignmentAttesters,
    alignmentTrustReady && statementCids.length > 0,
  )

  return (
    <Stack spacing={3} data-testid="statements-page">
      <Box>
        <Stack direction="row" alignItems="center">
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
            Signed statements
          </Typography>
          <HeaderInfoTip
            title="Direct signatures from this wallet. Retracting a signature removes the statement from this list once the indexer catches up."
            label="About this list"
          />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 560 }}>
          These are statements you have signed. They are not ranked here; this is
          just the list for this wallet.
        </Typography>
      </Box>

      {!connected && (
        <ConnectWalletHint>Connect a wallet to see statements you have signed.</ConnectWalletHint>
      )}

      {connected && loading && statements.length === 0 && (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Loading signed statements…
          </Typography>
        </Stack>
      )}

      {connected && !loading && statements.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No signed statements yet. Open a statement and sign it to add it here.
        </Alert>
      )}

      {statements.map((statement) => (
        <Paper
          key={statement.cid}
          elevation={0}
          data-testid="signed-statement"
          sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
        >
          <Typography
            component={RouterLink}
            to={`/statement/${statement.cid}`}
            variant="subtitle1"
            sx={{ fontWeight: 700, color: 'inherit', textDecoration: 'none' }}
          >
            {statement.title?.trim() || 'Untitled statement'}
          </Typography>
          {statement.excerpt && statement.excerpt.trim() !== statement.title?.trim() && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {statement.excerpt}
            </Typography>
          )}
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ mt: 1 }}
          >
            <SupportButton
              statementCid={statement.cid as IpfsCidV1}
              onSupported={(info) => {
                if (info.indexed) {
                  refreshCounts()
                  refresh()
                }
              }}
              subject="statement"
              label="Sign"
              compact
              showConnectPrompt={false}
            />
            <StatementSupportStats
              statementCid={statement.cid}
              support={perPlank.get(statement.cid)}
              supportLoading={countsLoading}
              projectCount={countByPlankCid.get(statement.cid) ?? 0}
            />
          </Stack>
        </Paper>
      ))}
    </Stack>
  )
}
