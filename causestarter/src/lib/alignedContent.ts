import type { ChannelWithCanonicalId } from '@commonality/sdk/content-funding'
import type { ContentAttestationInfo } from '@ui/content-funding'

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

/** Content items with a current positive attestation to one of the cause statements. */
export function selectAlignedContentItems(
  channels: readonly ChannelWithCanonicalId[],
  attestations: Map<string, ContentAttestationInfo[]>,
  statementCids: readonly string[],
): AlignedContentItem[] {
  const wanted = new Set(statementCids.filter(Boolean))
  if (wanted.size === 0) return []

  const rows: AlignedContentItem[] = []
  const seen = new Set<string>()

  for (const channel of channels) {
    for (const contract of channel.contracts) {
      for (const item of contract.contentItems) {
        const matches = (attestations.get(item.canonicalId) ?? [])
          .filter((attestation) => attestation.attested && wanted.has(attestation.statementCid))
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
