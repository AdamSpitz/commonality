import { Link as RouterLink } from 'react-router-dom'
import { Link, Typography } from '@mui/material'
import { useAccount } from 'wagmi'
import { useTrustedSet } from '@ui/shared'
import { getRuntimeConfigValue } from '../lib/runtimeConfig'

/** True when CauseStarter is filtering vouches through the starter network. */
export function useUsingStarterNetworkFilter(): boolean {
  const { address } = useAccount()
  const { trustedSet: personalAlignmentAttesters, isLoading: personalTrustLoading } =
    useTrustedSet(address)
  const defaultAlignmentTrustRoot = getRuntimeConfigValue('VITE_DEFAULT_ALIGNMENT_TRUST_ROOT')
  const { trustedSet: defaultAlignmentAttesters, isLoading: defaultTrustLoading } =
    useTrustedSet(defaultAlignmentTrustRoot, { maxHops: 1 })

  const starterReady = Boolean(
    defaultAlignmentAttesters && defaultAlignmentAttesters.size > 0,
  ) || Boolean(defaultAlignmentTrustRoot)
  const usingDefaultAlignmentTrust =
    personalAlignmentAttesters === undefined && starterReady
  const trustLoading =
    personalTrustLoading || (personalAlignmentAttesters === undefined && defaultTrustLoading)

  return !trustLoading && usingDefaultAlignmentTrust
}

/**
 * Copy for project/cause-board surfaces when the visitor has no personal
 * trust set and CauseStarter is filtering vouches through the starter network.
 */
export function StarterNetworkFilterCopy() {
  if (!useUsingStarterNetworkFilter()) return null

  return (
    <Typography variant="body2" data-testid="starter-network-filter-notice">
      Projects are filtered using CauseStarter's starter network. You can replace it with
      your own choices in{' '}
      <Link component={RouterLink} to="/settings" color="inherit" underline="always">
        trust settings
      </Link>
      .
    </Typography>
  )
}
