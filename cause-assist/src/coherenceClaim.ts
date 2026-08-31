/**
 * Well-known topic/claim CIDs for roster coherence badges.
 *
 * Must stay pinned to the same PublishedData CIDs as
 * ui/src/causestarter/lib/causeRoster.ts (ROSTER_COHERENCE_TOPIC / CLAIM).
 * Subject on chain is the roster document CID digest; claim/topic are these.
 */
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import { cidToBytes32 } from '@commonality/sdk/utils'

/** Pinned: causeRoster.test.ts "pins well-known coherence topic and claim CIDs". */
export const ROSTER_COHERENCE_TOPIC =
  'bafkreigcuduguak3tvfltu56ggksxheukrqtbvf22zntpb7uibbpni27zm' as IpfsCidV1

export const ROSTER_COHERENCE_CLAIM =
  'bafkreiddm4nvelu26hac2hqc6gpaegbrvcjfficxoddgnhjxedokngrv6a' as IpfsCidV1

export function rosterSubjectId(rosterCid: string): `0x${string}` {
  return cidToBytes32(rosterCid)
}
