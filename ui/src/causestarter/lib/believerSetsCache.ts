/** Believer-set cache keyed by statement CID + trusted-attester list. */

import { getStatementBelieverSets, type StatementBelieverSets } from '@commonality/sdk/conceptspace'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import type { SDKMachinery } from '@commonality/sdk/machinery'

/**
 * How long a cached set stays servable. Supporter counts drift as people sign,
 * so this is short enough that a page left open goes stale rather than wrong,
 * and long enough to cover a navigation round trip.
 */
const TTL_MS = 60_000

interface Entry {
  fetchedAt: number
  promise: Promise<StatementBelieverSets>
}

const entries = new Map<string, Entry>()

/** Space-separated because an attester key is a sorted address list and a CID contains neither spaces nor addresses. */
function keyFor(cid: string, attestersKey: string): string {
  return `${attestersKey} ${cid}`
}

function dropExpired(now: number): void {
  for (const [key, entry] of [...entries.entries()]) {
    if (now - entry.fetchedAt >= TTL_MS) entries.delete(key)
  }
}

export function loadBelieverSets(
  machinery: SDKMachinery,
  cid: string,
  trustedAttesters: string[] | undefined,
  attestersKey: string,
  now = Date.now(),
): Promise<StatementBelieverSets> {
  dropExpired(now)
  const key = keyFor(cid, attestersKey)
  const existing = entries.get(key)
  if (existing) return existing.promise

  const promise = getStatementBelieverSets(machinery, cid as IpfsCidV1, trustedAttesters)
  // A failed fetch must not stay cached, or one blip poisons the plank for a
  // whole TTL and the retry appears to do nothing.
  void promise.catch(() => {
    if (entries.get(key)?.promise === promise) entries.delete(key)
  })
  entries.set(key, { fetchedAt: now, promise })
  return promise
}

/** Drop cached sets so the next read refetches. Omit `cids` to clear everything. */
export function invalidateBelieverSets(cids?: readonly string[]): void {
  if (!cids) {
    entries.clear()
    return
  }
  const wanted = new Set(cids)
  for (const key of [...entries.keys()]) {
    if (wanted.has(key.slice(key.indexOf(' ') + 1))) entries.delete(key)
  }
}
