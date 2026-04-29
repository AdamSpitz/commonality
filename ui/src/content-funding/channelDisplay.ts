import { parseCanonicalChannelId } from '@commonality/sdk'

export interface ChannelDisplayMetadata {
  displayName?: string
  handle?: string
  creatorDisplayName?: string
  channelDisplayName?: string
  channelHandle?: string
}

export interface ChannelDisplayLabels {
  primary: string
  secondary: string | null
}

export function getFallbackChannelDisplayName(canonicalId: string | null): string {
  if (!canonicalId) return 'Unknown Channel'
  try {
    const parsed = parseCanonicalChannelId(canonicalId)
    switch (parsed.platform) {
      case 'twitter': return `@${parsed.stableId}`
      case 'youtube': return parsed.stableId
      case 'substack': return `${parsed.stableId}.substack.com`
    }
  } catch {
    const parts = canonicalId.split(':')
    if (parts[0] === 'twitter' && parts[2]) return `@${parts[2]}`
    if (parts[0] === 'youtube' && parts[2]) return parts[2]
    if (parts[0] === 'substack' && parts[1]) return `${parts[1]}.substack.com`
    return canonicalId
  }
}

function firstNonEmptyString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

export function getChannelDisplayLabels(
  canonicalId: string | null,
  metadata?: ChannelDisplayMetadata | null,
): ChannelDisplayLabels {
  const metadataName = firstNonEmptyString(
    metadata?.displayName,
    metadata?.channelDisplayName,
    metadata?.creatorDisplayName,
  )
  const metadataHandle = firstNonEmptyString(metadata?.handle, metadata?.channelHandle)

  let primary = metadataName ?? metadataHandle ?? getFallbackChannelDisplayName(canonicalId)
  if (canonicalId) {
    try {
      const parsed = parseCanonicalChannelId(canonicalId)
      if (parsed.platform === 'twitter' && metadataName && metadataHandle) {
        primary = `${metadataName} (${metadataHandle})`
      }
    } catch {
      // Keep the metadata-derived or fallback label.
    }
  }

  return {
    primary,
    secondary: canonicalId && primary !== canonicalId ? canonicalId : null,
  }
}
