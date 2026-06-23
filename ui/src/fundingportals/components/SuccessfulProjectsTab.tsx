import { useState } from 'react'
import { Alert, Box } from '@mui/material'
import { useAccount } from 'wagmi'
import { useTrustedSet } from '../../shared'
import { SuccessfulProjectsList } from './SuccessfulProjectsList'
import { DiscoverySlider } from './DiscoverySlider'
import { DISCOVERY_LEVEL_MAX_HOPS, type DiscoveryLevel } from './discoveryLevels'

/**
 * The Successful tab on the cause board, wired to a discovery slider that loosens
 * the trust-graph filter on success vouches ("My network" → "+1 hop" → "Anyone").
 *
 * The slider controls the `maxHops` trust-traversal knob on a dedicated
 * `useTrustedSet` call so the Successful tab's filter is independent of the
 * Aligned tab's. "Anyone" drops the trust filter entirely (passing `undefined`
 * for the trusted-attester set and weights), which falls back to the flat
 * count-based success confidence score.
 */
export function SuccessfulProjectsTab({
  statementCid,
  trustedImplicationAttesters,
}: {
  statementCid: string
  trustedImplicationAttesters?: Iterable<string>
}) {
  const { address } = useAccount()
  const [discoveryLevel, setDiscoveryLevel] = useState<DiscoveryLevel>('network')
  const maxHops = DISCOVERY_LEVEL_MAX_HOPS[discoveryLevel]
  const { trustedSet, trustWeights, isLoading } = useTrustedSet(address, { maxHops })

  const filterActive = discoveryLevel !== 'anyone'
  const trustedSuccessAttesters = filterActive ? trustedSet : undefined
  const activeTrustWeights = filterActive ? trustWeights : undefined

  return (
    <Box>
      <DiscoverySlider value={discoveryLevel} onChange={setDiscoveryLevel} disabled={!address} />

      {address && isLoading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {trustedSet
            ? `Refreshing your trust network. Success vouches are currently filtered using ${trustedSet.size} account${trustedSet.size !== 1 ? 's' : ''} in your network. Results may still change as more are discovered.`
            : 'Refreshing your trust network. Until any trusted accounts are found, success vouches are not filtered.'}
        </Alert>
      )}

      <SuccessfulProjectsList
        statementCid={statementCid}
        trustedImplicationAttesters={trustedImplicationAttesters}
        trustedSuccessAttesters={trustedSuccessAttesters}
        trustWeights={activeTrustWeights}
      />
    </Box>
  )
}
