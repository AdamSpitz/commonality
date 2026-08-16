import { Alert } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useTrustedSet } from '@ui/shared'
import { getRuntimeConfigValue } from '../lib/runtimeConfig'

/**
 * Shown on project/cause-board surfaces when the visitor has no personal
 * trust set and CauseStarter is filtering vouches through the starter network.
 */
export function StarterNetworkFilterNotice() {
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

  if (trustLoading || !usingDefaultAlignmentTrust) return null

  return (
    <Alert severity="info" sx={{ borderRadius: 2 }} data-testid="starter-network-filter-notice">
      Projects are filtered using CauseStarter's starter network. You can replace it with
      your own choices in <RouterLink to="/settings">trust settings</RouterLink>.
    </Alert>
  )
}
