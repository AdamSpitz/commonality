import type { ChannelWithCanonicalId } from '@commonality/sdk/content-funding'
import type { Currency } from '@commonality/sdk/utils'
import type { ContentAttestationInfo } from './hooks/useContentFundingState'
import { statementCidInSet } from './statementCidMatch'

export interface AlignedContentContract {
  contractAddress: string
  viaStatementCids: string[]
  alignedItemCount: number
  contentItemCount: number
  totalReceived: string
  threshold: string
  deadline: string
  fundingCurrency: Currency | undefined
}

function trustedAttesterSet(trustedAttesters?: Iterable<string>): Set<string> | undefined {
  if (!trustedAttesters) return undefined
  const set = new Set(
    [...trustedAttesters].map((address) => address.toLowerCase()).filter(Boolean),
  )
  return set.size > 0 ? set : undefined
}

export interface AlignedContentItem {
  canonicalId: string
  contractAddress: string
  channelCanonicalId: string | null
  statementCids: string[]
}

function platformFromChannelId(channelId: string | null): string {
  if (!channelId) return 'twitter'
  if (channelId.startsWith('youtube:')) return 'youtube'
  if (channelId.startsWith('substack:')) return 'substack'
  return 'twitter'
}

export function contentItemPublicUrl(canonicalId: string): string | null {
  const twitterMatch = /^twitter:uid:\d+:(\d+)$/.exec(canonicalId)
  if (twitterMatch) return `https://x.com/i/web/status/${twitterMatch[1]}`
  const youtubeMatch = /^youtube:channel:[^:]+:([A-Za-z0-9_-]{11})$/.exec(canonicalId)
  if (youtubeMatch) return `https://www.youtube.com/watch?v=${youtubeMatch[1]}`
  const substackMatch = /^substack:([a-z0-9-]+)\/([A-Za-z0-9-]+)$/.exec(canonicalId)
  if (substackMatch) return `https://${substackMatch[1]}.substack.com/p/${substackMatch[2]}`
  return null
}

export function contentChannelPath(channelCanonicalId: string | null): string | null {
  if (!channelCanonicalId) return null
  return `/content/${platformFromChannelId(channelCanonicalId)}/${encodeURIComponent(channelCanonicalId)}`
}

function alignedItemsForStatements(
  channels: readonly ChannelWithCanonicalId[],
  attestations: Map<string, ContentAttestationInfo[]>,
  statementCids: readonly string[],
  trustedAttesters?: Iterable<string>,
): AlignedContentItem[] {
  const wanted = new Set(statementCids.filter(Boolean))
  if (wanted.size === 0) return []
  const trusted = trustedAttesterSet(trustedAttesters)

  const rows: AlignedContentItem[] = []
  const seen = new Set<string>()

  for (const channel of channels) {
    for (const contract of channel.contracts) {
      for (const item of contract.contentItems) {
        const matches = (attestations.get(item.canonicalId) ?? [])
          .filter((attestation) =>
            attestation.attested
            && statementCidInSet(attestation.statementCid, wanted)
            && (!trusted || trusted.has(attestation.attester.toLowerCase())))
          .map((attestation) => attestation.statementCid)
        if (matches.length === 0) continue
        const key = `${item.canonicalId}:${contract.contractAddress}`
        if (seen.has(key)) continue
        seen.add(key)
        rows.push({
          canonicalId: item.canonicalId,
          contractAddress: contract.contractAddress,
          channelCanonicalId: channel.canonicalChannelId,
          statementCids: [...new Set(matches)],
        })
      }
    }
  }
  return rows
}

/** Content items with a current positive attestation to one of the cause statements. */
export function selectAlignedContentItems(
  channels: readonly ChannelWithCanonicalId[],
  attestations: Map<string, ContentAttestationInfo[]>,
  statementCids: readonly string[],
  trustedAttesters?: Iterable<string>,
): AlignedContentItem[] {
  return alignedItemsForStatements(channels, attestations, statementCids, trustedAttesters)
}

/** One row per contract that contains at least one aligned content item. */
export function selectAlignedContentContracts(
  channels: readonly ChannelWithCanonicalId[],
  attestations: Map<string, ContentAttestationInfo[]>,
  statementCids: readonly string[],
  trustedAttesters?: Iterable<string>,
): AlignedContentContract[] {
  const items = alignedItemsForStatements(channels, attestations, statementCids, trustedAttesters)
  const byAddress = new Map<string, AlignedContentContract>()

  for (const item of items) {
    const key = item.contractAddress.toLowerCase()
    const existing = byAddress.get(key)
    if (existing) {
      existing.alignedItemCount += 1
      for (const cid of item.statementCids) {
        if (!existing.viaStatementCids.includes(cid)) existing.viaStatementCids.push(cid)
      }
      continue
    }

    let contentItemCount = 0
    let totalReceived = '0'
    let threshold = '0'
    let deadline = '0'
    let fundingCurrency: Currency | undefined
    for (const channel of channels) {
      const contract = channel.contracts.find(
        (entry) => entry.contractAddress.toLowerCase() === key,
      )
      if (!contract) continue
      contentItemCount = contract.contentItems.length
      if (contract.project) {
        totalReceived = contract.project.totalReceived
        threshold = contract.project.threshold
        deadline = contract.project.deadline
        fundingCurrency = contract.project.fundingCurrency
      }
      break
    }

    byAddress.set(key, {
      contractAddress: item.contractAddress,
      viaStatementCids: [...item.statementCids],
      alignedItemCount: 1,
      contentItemCount,
      totalReceived,
      threshold,
      deadline,
      fundingCurrency,
    })
  }

  return [...byAddress.values()]
}
