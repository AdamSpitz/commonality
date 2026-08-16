import { Alert, Box } from '@mui/material'
import { useAccount } from 'wagmi'
import { useTrustedSet } from '../../shared'
import { SuccessfulProjectsList } from './SuccessfulProjectsList'
import { DISCOVERY_LEVEL_MAX_HOPS } from './discoveryLevels'
import { useDiscoveryLevel } from '../hooks/useDiscoveryLevel'
import type { ProjectLinkMode } from './AlignedProjectCard'

/**
 * The Successful tab on the cause board, filtered by the persisted discovery
 * level from trust settings ("My network" → "+1 hop" → "Anyone").
 *
 * The stored level controls the `maxHops` trust-traversal knob on a dedicated
 * `useTrustedSet` call. "Anyone" drops the trust filter entirely (passing
 * `undefined` for the trusted-attester set and weights), which falls back to
 * the flat count-based success confidence score.
 */
export function SuccessfulProjectsTab({
  statementCid,
  statementCids,
  trustedImplicationAttesters,
  projectLinks = 'lazyGiving',
  reimbursement = 'outstanding',
}: {
  statementCid: string
  statementCids?: string[]
  trustedImplicationAttesters?: Iterable<string>
  projectLinks?: ProjectLinkMode
  reimbursement?: 'outstanding' | 'reimbursed'
}) {
  const { address } = useAccount()
  const [discoveryLevel] = useDiscoveryLevel()
  const maxHops = DISCOVERY_LEVEL_MAX_HOPS[discoveryLevel]
  const { trustedSet, trustWeights, isLoading } = useTrustedSet(address, { maxHops })

  const filterActive = discoveryLevel !== 'anyone'
  const trustedSuccessAttesters = filterActive ? trustedSet : undefined
  const activeTrustWeights = filterActive ? trustWeights : undefined

  return (
    <Box>
      {address && isLoading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {trustedSet
            ? `Refreshing your trust network. Success vouches are currently filtered using ${trustedSet.size} account${trustedSet.size !== 1 ? 's' : ''} in your network. Results may still change as more are discovered.`
            : 'Refreshing your trust network. Until any trusted accounts are found, success vouches are not filtered.'}
        </Alert>
      )}

      <SuccessfulProjectsList
        statementCid={statementCid}
        statementCids={statementCids}
        trustedImplicationAttesters={trustedImplicationAttesters}
        trustedSuccessAttesters={trustedSuccessAttesters}
        trustWeights={activeTrustWeights}
        projectLinks={projectLinks}
        reimbursement={reimbursement}
      />
    </Box>
  )
}
