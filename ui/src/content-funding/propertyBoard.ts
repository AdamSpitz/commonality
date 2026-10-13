import type { ChannelWithCanonicalId } from '@commonality/sdk/content-funding'
import type { ContentAttestationInfo } from './hooks/useContentFundingState'
import { statementCidInSet } from './statementCidMatch'

/** Newest attested items shown before the viewer has to narrow the scope. */
export const PROPERTY_BOARD_CAP = 40

export const FOLLOWED_CHANNELS_KEY = 'content-funding.followed-channels'
export const HIDDEN_PROPERTY_ITEMS_KEY = 'content-funding.hidden-property-items'

export type PropertyBoardScope = 'unwrapped' | 'channel' | 'following'

export interface PropertyBoardItem {
  canonicalId: string
  channelCanonicalId: string | null
  contractAddress: string | null
  /** Still registered to an open or successful contract. */
  inOpenContract: boolean
  contentId: bigint
  sortBlock: bigint
}

const OPEN_CONTRACT_STATUSES = new Set(['active', 'successful', 'unknown'])

function trustedSet(trustedAttesters?: Iterable<string>): Set<string> | undefined {
  if (!trustedAttesters) return undefined
  const set = new Set([...trustedAttesters].map((address) => address.toLowerCase()).filter(Boolean))
  return set.size > 0 ? set : undefined
}

function matchesProperty(
  attestations: readonly ContentAttestationInfo[],
  statementCid: string,
  trusted?: Set<string>,
): ContentAttestationInfo | undefined {
  return attestations.find((attestation) => {
    if (!attestation.attested) return false
    if (trusted && !trusted.has(attestation.attester.toLowerCase())) return false
    if (!statementCidInSet(attestation.statementCid, new Set([statementCid]))) return false
    if (!attestation.topicStatementCid) return false
    return statementCidInSet(attestation.topicStatementCid, new Set([statementCid]))
  })
}

/**
 * Items a trusted attester marked with `statementCid` (statement and topic).
 * Only registry items are listed: an attestation event stores the canonical id
 * as a hash, so a post that was never registered cannot be shown.
 */
export function selectPropertyBoardItems(
  channels: readonly ChannelWithCanonicalId[],
  attestations: Map<string, ContentAttestationInfo[]>,
  statementCid: string,
  trustedAttesters?: Iterable<string>,
): PropertyBoardItem[] {
  if (!statementCid) return []
  const trusted = trustedSet(trustedAttesters)
  const byCanonicalId = new Map<string, PropertyBoardItem>()

  for (const channel of channels) {
    for (const contract of channel.contracts) {
      for (const item of contract.contentItems) {
        const match = matchesProperty(attestations.get(item.canonicalId) ?? [], statementCid, trusted)
        if (!match) continue
        const inOpenContract = item.status !== 'released' && OPEN_CONTRACT_STATUSES.has(contract.status)
        const next: PropertyBoardItem = {
          canonicalId: item.canonicalId,
          channelCanonicalId: channel.canonicalChannelId,
          contractAddress: inOpenContract ? contract.contractAddress : null,
          inOpenContract,
          contentId: item.contentId,
          sortBlock: match.blockNumber ?? 0n,
        }
        const existing = byCanonicalId.get(item.canonicalId)
        if (!existing || (!existing.inOpenContract && next.inOpenContract) || next.sortBlock > existing.sortBlock) {
          byCanonicalId.set(item.canonicalId, next)
        }
      }
    }
  }

  return [...byCanonicalId.values()]
}

export function applyPropertyBoardScope(
  items: readonly PropertyBoardItem[],
  scope: PropertyBoardScope,
  options: { channelCanonicalId?: string | null; followedChannels?: ReadonlySet<string>; hidden?: ReadonlySet<string> },
): PropertyBoardItem[] {
  const hidden = options.hidden ?? new Set<string>()
  const followed = options.followedChannels ?? new Set<string>()
  const channelId = options.channelCanonicalId ?? ''

  const filtered = items.filter((item) => {
    if (hidden.has(item.canonicalId)) return false
    if (scope === 'unwrapped') return !item.inOpenContract
    if (scope === 'channel') return Boolean(channelId) && item.channelCanonicalId === channelId
    return Boolean(item.channelCanonicalId && followed.has(item.channelCanonicalId))
  })

  filtered.sort((left, right) => {
    if (left.sortBlock !== right.sortBlock) return left.sortBlock > right.sortBlock ? -1 : 1
    if (left.contentId !== right.contentId) return left.contentId > right.contentId ? -1 : 1
    return left.canonicalId < right.canonicalId ? -1 : 1
  })

  return filtered.slice(0, PROPERTY_BOARD_CAP)
}

function readStringSet(storage: Storage, key: string): Set<string> {
  try {
    const parsed = JSON.parse(storage.getItem(key) ?? '[]')
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((value): value is string => typeof value === 'string' && value.length > 0))
  } catch {
    return new Set()
  }
}

function writeStringSet(storage: Storage, key: string, values: ReadonlySet<string>): void {
  storage.setItem(key, JSON.stringify([...values]))
}

export function readFollowedChannels(storage: Storage): Set<string> {
  return readStringSet(storage, FOLLOWED_CHANNELS_KEY)
}

export function writeFollowedChannels(storage: Storage, channels: ReadonlySet<string>): void {
  writeStringSet(storage, FOLLOWED_CHANNELS_KEY, channels)
}

export function readHiddenPropertyItems(storage: Storage): Set<string> {
  return readStringSet(storage, HIDDEN_PROPERTY_ITEMS_KEY)
}

export function writeHiddenPropertyItems(storage: Storage, items: ReadonlySet<string>): void {
  writeStringSet(storage, HIDDEN_PROPERTY_ITEMS_KEY, items)
}
