/**
 * Funding read for a roster's coherence badge.
 * Kept out of causeRoster.ts. The read uses AlignmentAttestations, not a funding package.
 */

import {
  getSubjectStatements,
  type AlignmentAttestation,
} from '@commonality/sdk/alignment-attestations'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import { ROSTER_COHERENCE_CLAIM, ROSTER_COHERENCE_TOPIC } from '@commonality/sdk/displayable-documents'
import { cidToBytes32 } from '@commonality/sdk/utils'

function rosterSubjectId(rosterCid: string): `0x${string}` {
  return cidToBytes32(rosterCid)
}

export interface RosterCoherenceBadge {
  rosterCid: string
  /** On-chain attester addresses that asserted the well-known coherence claim. */
  attesters: `0x${string}`[]
  /** Earliest attestation timestamp (ISO), when available. */
  attestedAt?: string
  attestations: AlignmentAttestation[]
}

/**
 * Load on-chain positive coherence attestations for a roster version CID.
 * Viewers recompute the badge from AlignmentAttestations + well-known claim/topic.
 *
 * `operator` is the Commonality operator address (from cause-assist /health).
 * Anyone can write the well-known claim about any roster — including the organizer —
 * so only attestations signed by that operator count. Without a known operator
 * there is nothing to trust, and no badge is shown.
 */
export async function loadRosterCoherenceBadge(
  machinery: SDKMachinery,
  rosterCid: string,
  operator: `0x${string}` | null | undefined,
): Promise<RosterCoherenceBadge | null> {
  if (!rosterCid || !operator) return null
  const operatorAddress = operator.toLowerCase()
  let attestations: AlignmentAttestation[]
  try {
    attestations = await getSubjectStatements(
      machinery,
      rosterSubjectId(rosterCid),
      undefined,
      ROSTER_COHERENCE_TOPIC,
    )
  } catch {
    return null
  }

  // AlignmentAttestations stores only the multihash digest; decoded CIDs may use
  // dag-pb (bafybei…) while well-known PublishedData CIDs use raw (bafkrei…).
  const claimDigest = cidToBytes32(ROSTER_COHERENCE_CLAIM).toLowerCase()
  const matching = attestations.filter((a) => {
    if (a.attester.toLowerCase() !== operatorAddress) return false
    try {
      return cidToBytes32(a.statementCid).toLowerCase() === claimDigest
    } catch {
      return a.statementCid === ROSTER_COHERENCE_CLAIM
    }
  })

  if (matching.length === 0) return null
  const active = matching

  const attesters = [...new Set(active.map((a) => a.attester.toLowerCase() as `0x${string}`))]
  const times = active
    .map((a) => a.createdAt)
    .filter((t): t is string => Boolean(t))
    .sort()
  return {
    rosterCid,
    attesters,
    attestedAt: times[0],
    attestations: active,
  }
}
