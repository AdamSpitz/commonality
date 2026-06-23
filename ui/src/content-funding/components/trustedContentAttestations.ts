import type { TrustedContentAttesterEntry } from '../../shared'
import type { ContentAttestationInfo } from '../hooks/useContentFundingState'

export function getTrustedContentAttestationMatches(
  attestations: ContentAttestationInfo[] | undefined,
  trustedAttesters: TrustedContentAttesterEntry[],
): ContentAttestationInfo[] {
  if (!attestations?.length || trustedAttesters.length === 0) return []
  const trustedAddresses = new Set(trustedAttesters.map((attester) => attester.address.toLowerCase()))
  return attestations.filter((attestation) => trustedAddresses.has(attestation.attester.toLowerCase()))
}
