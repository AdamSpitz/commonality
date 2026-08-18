import { cidToBytes32 } from '@commonality/sdk/utils'

/** True when two CIDs are the same string or the same on-chain digest.
 *  Alignment events decode as dag-pb `bafybei…`; PublishedData often stores raw `bafkrei…`. */
export function cidReferencesSameDigest(left: string, right: string): boolean {
  if (left.toLowerCase() === right.toLowerCase()) return true
  try {
    return cidToBytes32(left) === cidToBytes32(right)
  } catch {
    return false
  }
}

export function statementCidInSet(statementCid: string, wanted: ReadonlySet<string>): boolean {
  if (wanted.has(statementCid)) return true
  for (const candidate of wanted) {
    if (cidReferencesSameDigest(statementCid, candidate)) return true
  }
  return false
}
