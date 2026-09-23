import { keccak256, stringToBytes, type Hex } from 'viem';

/** Platforms with stable channel and content identifiers. */
export type ContentPlatform = 'twitter' | 'youtube' | 'substack';

export type ContentIdentityErrorCode =
  | 'invalid_channel_id'
  | 'invalid_content_suffix';

/**
 * A channel or content identifier could not be built or parsed.
 * This is an identity-format failure, not a funding or payout failure.
 */
export class ContentIdentityError extends Error {
  readonly code: ContentIdentityErrorCode;

  constructor(code: ContentIdentityErrorCode, message: string) {
    super(message);
    this.name = 'ContentIdentityError';
    this.code = code;
  }
}

/** Platform and stable id parsed from a canonical channel id. */
export interface ParsedCanonicalChannelId {
  platform: ContentPlatform;
  /** Platform-specific stable identifier (numeric Twitter user id, UC-prefixed YouTube channel id, Substack slug). */
  stableId: string;
}

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const SUBSTACK_PUBLICATION_PATTERN = /^[a-z0-9-]+$/;
const SUBSTACK_SLUG_PATTERN = /^[A-Za-z0-9-]+$/;
const TWITTER_CHANNEL_ID_PATTERN = /^\d+$/;
const YOUTUBE_CHANNEL_ID_PATTERN = /^UC[A-Za-z0-9_-]+$/;

/**
 * Build a canonical channel ID string from a platform and stable identifier.
 *
 * - Twitter: `"twitter:uid:<numericUserId>"`
 * - YouTube: `"youtube:channel:<UCchannelId>"`
 * - Substack: `"substack:<publicationSlug>"`
 */
export function buildCanonicalChannelId(
  platform: ContentPlatform,
  stableId: string,
): string {
  switch (platform) {
    case 'twitter':
      if (!TWITTER_CHANNEL_ID_PATTERN.test(stableId)) {
        throw new ContentIdentityError(
          'invalid_channel_id',
          `Twitter channel IDs must use numeric user IDs: ${stableId}`,
        );
      }
      return `twitter:uid:${stableId}`;
    case 'youtube':
      if (!YOUTUBE_CHANNEL_ID_PATTERN.test(stableId)) {
        throw new ContentIdentityError(
          'invalid_channel_id',
          `YouTube channel IDs must use UC-prefixed channel IDs: ${stableId}`,
        );
      }
      return `youtube:channel:${stableId}`;
    case 'substack': {
      const normalizedPublication = stableId.trim().toLowerCase();
      if (!SUBSTACK_PUBLICATION_PATTERN.test(normalizedPublication)) {
        throw new ContentIdentityError(
          'invalid_channel_id',
          `Substack channel IDs must use publication slugs: ${stableId}`,
        );
      }
      return `substack:${normalizedPublication}`;
    }
  }
}

/**
 * Parse a canonical channel ID string back into its platform and stable ID.
 *
 * @param channelId - For example `"twitter:uid:123"`, `"youtube:channel:UCxyz"`, `"substack:publication"`
 */
export function parseCanonicalChannelId(channelId: string): ParsedCanonicalChannelId {
  const twitterMatch = /^twitter:uid:(\d+)$/.exec(channelId);
  if (twitterMatch) {
    return { platform: 'twitter', stableId: twitterMatch[1] };
  }

  const youTubeMatch = /^youtube:channel:(UC[A-Za-z0-9_-]+)$/.exec(channelId);
  if (youTubeMatch) {
    return { platform: 'youtube', stableId: youTubeMatch[1] };
  }

  const substackMatch = /^substack:([a-z0-9-]+)$/.exec(channelId);
  if (substackMatch) {
    return { platform: 'substack', stableId: substackMatch[1] };
  }

  throw new ContentIdentityError(
    'invalid_channel_id',
    `Invalid canonical channel ID: ${channelId}`,
  );
}

/**
 * Build a canonical content ID from a channel ID and a content suffix.
 *
 * - Twitter: `"twitter:uid:<userId>:<tweetId>"`
 * - YouTube: `"youtube:channel:<channelId>:<videoId>"`
 * - Substack: `"substack:<publication>/<slug>"`
 */
export function buildCanonicalContentId(channelId: string, contentSuffix: string): string {
  const parsedChannelId = parseCanonicalChannelId(channelId);

  switch (parsedChannelId.platform) {
    case 'twitter':
      if (!/^\d+$/.test(contentSuffix)) {
        throw new ContentIdentityError(
          'invalid_content_suffix',
          `Twitter content suffix must be a numeric tweet ID: ${contentSuffix}`,
        );
      }
      return `${channelId}:${contentSuffix}`;
    case 'youtube':
      if (!YOUTUBE_VIDEO_ID_PATTERN.test(contentSuffix)) {
        throw new ContentIdentityError(
          'invalid_content_suffix',
          `YouTube content suffix must be an 11-character video ID: ${contentSuffix}`,
        );
      }
      return `${channelId}:${contentSuffix}`;
    case 'substack':
      if (!SUBSTACK_SLUG_PATTERN.test(contentSuffix)) {
        throw new ContentIdentityError(
          'invalid_content_suffix',
          `Substack content suffix must be a publication post slug: ${contentSuffix}`,
        );
      }
      return `${channelId}/${contentSuffix}`;
  }
}

/** keccak256 of a canonical channel or content ID, for on-chain storage. */
export function hashCanonicalId(canonicalId: string): Hex {
  return keccak256(stringToBytes(canonicalId));
}

/**
 * Channel canonical ID implied by a content canonical ID.
 *
 * Twitter: `"twitter:uid:DIGITS:TWEETID"` → `"twitter:uid:DIGITS"`
 * YouTube: `"youtube:channel:UCID:VIDEOID"` → `"youtube:channel:UCID"`
 * Substack: `"substack:PUB/SLUG"` → `"substack:PUB"`
 */
export function extractChannelCanonicalIdFromContentCanonicalId(contentCanonicalId: string): string {
  const slashIndex = contentCanonicalId.indexOf('/');
  if (slashIndex !== -1) {
    return contentCanonicalId.slice(0, slashIndex);
  }
  const parts = contentCanonicalId.split(':');
  if (parts[0] === 'substack' && parts.length >= 3) {
    // Some local/seed deployments use ":" for every platform: "substack:pub:slug".
    return parts.slice(0, 2).join(':');
  }
  if (parts.length >= 4) {
    return parts.slice(0, 3).join(':');
  }
  throw new ContentIdentityError(
    'invalid_content_suffix',
    `Cannot extract channel canonical ID from content canonical ID: ${contentCanonicalId}`,
  );
}
