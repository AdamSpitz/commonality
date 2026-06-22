/**
 * Discovery scope for the trust-graph filter on a cause-board view.
 *
 * - `network`  — only vouches from accounts the viewer directly trusts (1 hop).
 * - `one-hop`  — the viewer's network plus one transitive hop (2 hops).
 * - `anyone`   — no trust filter; show every vouch (falls back to the flat count-based score).
 */
export type DiscoveryLevel = 'network' | 'one-hop' | 'anyone'

export const DISCOVERY_LEVELS: readonly DiscoveryLevel[] = ['network', 'one-hop', 'anyone'] as const

/**
 * Map a discovery level to the `maxHops` trust-traversal knob.
 *
 * `anyone` returns `undefined`, signaling the caller should drop the trust filter
 * entirely (pass `undefined` for the trusted-attester set and weights) rather than
 * traversing an arbitrarily deep graph.
 */
export const DISCOVERY_LEVEL_MAX_HOPS: Record<DiscoveryLevel, number | undefined> = {
  network: 1,
  'one-hop': 2,
  anyone: undefined,
}

export const DISCOVERY_LEVEL_LABELS: Record<DiscoveryLevel, string> = {
  network: 'My network',
  'one-hop': '+1 hop',
  anyone: 'Anyone',
}

export const DISCOVERY_LEVEL_INDEX: Record<DiscoveryLevel, number> = {
  network: 0,
  'one-hop': 1,
  anyone: 2,
}

export const DISCOVERY_INDEX_LEVEL: DiscoveryLevel[] = ['network', 'one-hop', 'anyone']
