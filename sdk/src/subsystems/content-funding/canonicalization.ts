import { keccak256, stringToBytes, type Hex } from 'viem';

/** Supported content platforms for the content-funding subsystem. */
export type ContentFundingPlatform = 'twitter' | 'youtube' | 'substack';

/** Error codes for content-funding URL/ID canonicalization failures. */
export type ContentFundingCanonicalizationErrorCode =
  | 'invalid_url'
  | 'unsupported_platform'
  | 'invalid_twitter_url'
  | 'invalid_youtube_url'
  | 'invalid_substack_url'
  | 'unsupported_substack_custom_domain'
  | 'invalid_channel_id'
  | 'invalid_content_suffix';

/**
 * Error thrown when a content-funding URL or canonical ID cannot be parsed.
 *
 * The `code` property identifies the specific failure reason, making it easy
 * to provide targeted user-facing error messages.
 */
export class ContentFundingCanonicalizationError extends Error {
  /** Machine-readable error code identifying the failure reason. */
  readonly code: ContentFundingCanonicalizationErrorCode;

  constructor(code: ContentFundingCanonicalizationErrorCode, message: string) {
    super(message);
    this.name = 'ContentFundingCanonicalizationError';
    this.code = code;
  }
}

/** Result of parsing a Twitter/X tweet URL. */
export interface ParsedTwitterStatusUrl {
  platform: 'twitter';
  /** Numeric tweet ID. */
  tweetId: string;
  /** Twitter handle (with @ prefix), if present in the URL. */
  handle?: string;
}

/** Result of parsing a YouTube video URL. */
export interface ParsedYouTubeVideoUrl {
  platform: 'youtube';
  /** 11-character YouTube video ID. */
  videoId: string;
}

/** Result of parsing a Substack post URL. */
export interface ParsedSubstackPostUrl {
  platform: 'substack';
  /** Substack publication subdomain slug. */
  publication: string;
  /** Post slug from the `/p/<slug>` path. */
  slug: string;
}

/** Discriminated union of all supported parsed content-funding URLs. */
export type ParsedContentFundingUrl =
  | ParsedTwitterStatusUrl
  | ParsedYouTubeVideoUrl
  | ParsedSubstackPostUrl;

/** Result of parsing a canonical channel ID string back into its components. */
export interface ParsedCanonicalChannelId {
  /** Platform the channel belongs to. */
  platform: ContentFundingPlatform;
  /** Platform-specific stable identifier (e.g. numeric Twitter user ID, UC-prefixed YouTube channel ID). */
  stableId: string;
}

const TWITTER_HOSTS = new Set(['twitter.com', 'www.twitter.com', 'x.com', 'www.x.com']);
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com']);
const YOUTUBE_SHORT_HOSTS = new Set(['youtu.be']);
const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const TWITTER_HANDLE_PATTERN = /^@?[A-Za-z0-9_]{1,15}$/;
const SUBSTACK_PUBLICATION_PATTERN = /^[a-z0-9-]+$/;
const SUBSTACK_SLUG_PATTERN = /^[A-Za-z0-9-]+$/;
const TWITTER_CHANNEL_ID_PATTERN = /^\d+$/;
const YOUTUBE_CHANNEL_ID_PATTERN = /^UC[A-Za-z0-9_-]+$/;

/**
 * Parse a content URL into its platform-specific components.
 *
 * Detects the platform from the URL hostname and delegates to the
 * appropriate platform-specific parser.
 *
 * @param rawUrl - Full URL to a tweet, YouTube video, or Substack post
 * @returns Parsed URL with platform-specific fields
 * @throws {@link ContentFundingCanonicalizationError} if the URL is invalid or from an unsupported platform
 */
export function parseContentFundingUrl(rawUrl: string): ParsedContentFundingUrl {
  const url = parseUrl(rawUrl);
  const host = url.hostname.toLowerCase();

  if (TWITTER_HOSTS.has(host)) {
    return parseTwitterStatusUrl(rawUrl);
  }
  if (YOUTUBE_HOSTS.has(host) || YOUTUBE_SHORT_HOSTS.has(host)) {
    return parseYouTubeVideoUrl(rawUrl);
  }
  if (host.endsWith('.substack.com')) {
    return parseSubstackPostUrl(rawUrl);
  }

  throw new ContentFundingCanonicalizationError(
    'unsupported_platform',
    `Unsupported content-funding platform in URL: ${rawUrl}`,
  );
}

/**
 * Parse a Twitter/X tweet URL into its components.
 *
 * Supports both `twitter.com` and `x.com` hosts, as well as the
 * `/i/web/status/<id>` and `/<handle>/status/<id>` URL formats.
 *
 * @param rawUrl - Full Twitter/X tweet URL
 * @returns Parsed tweet ID and optional handle
 * @throws {@link ContentFundingCanonicalizationError} with code `invalid_twitter_url`
 */
export function parseTwitterStatusUrl(rawUrl: string): ParsedTwitterStatusUrl {
  const url = parseUrl(rawUrl);
  const host = url.hostname.toLowerCase();
  if (!TWITTER_HOSTS.has(host)) {
    throw new ContentFundingCanonicalizationError(
      'invalid_twitter_url',
      `Not a Twitter/X URL: ${rawUrl}`,
    );
  }

  const segments = getPathSegments(url);

  if (
    segments.length >= 4 &&
    segments[0] === 'i' &&
    segments[1] === 'web' &&
    segments[2] === 'status'
  ) {
    const tweetId = requireTwitterTweetId(segments[3], rawUrl);
    return {
      platform: 'twitter',
      tweetId,
    };
  }

  if (segments.length < 3 || segments[1] !== 'status') {
    throw new ContentFundingCanonicalizationError(
      'invalid_twitter_url',
      `Twitter/X URL must point to a tweet status: ${rawUrl}`,
    );
  }

  const handle = normalizeTwitterHandle(segments[0], rawUrl);
  const tweetId = requireTwitterTweetId(segments[2], rawUrl);

  return {
    platform: 'twitter',
    tweetId,
    handle,
  };
}

/**
 * Parse a YouTube video URL into its components.
 *
 * Supports `youtube.com/watch?v=`, `youtube.com/shorts/`, `youtube.com/embed/`,
 * and `youtu.be/` short URLs.
 *
 * @param rawUrl - Full YouTube video URL
 * @returns Parsed 11-character video ID
 * @throws {@link ContentFundingCanonicalizationError} with code `invalid_youtube_url`
 */
export function parseYouTubeVideoUrl(rawUrl: string): ParsedYouTubeVideoUrl {
  const url = parseUrl(rawUrl);
  const host = url.hostname.toLowerCase();
  let videoId: string | null = null;

  if (YOUTUBE_SHORT_HOSTS.has(host)) {
    const segments = getPathSegments(url);
    videoId = segments[0] ?? null;
  } else if (YOUTUBE_HOSTS.has(host)) {
    const segments = getPathSegments(url);
    if (segments[0] === 'watch') {
      videoId = url.searchParams.get('v');
    } else if (segments[0] === 'shorts' || segments[0] === 'embed') {
      videoId = segments[1] ?? null;
    }
  } else {
    throw new ContentFundingCanonicalizationError(
      'invalid_youtube_url',
      `Not a YouTube URL: ${rawUrl}`,
    );
  }

  if (!videoId || !YOUTUBE_VIDEO_ID_PATTERN.test(videoId)) {
    throw new ContentFundingCanonicalizationError(
      'invalid_youtube_url',
      `YouTube URL must contain a valid 11-character video ID: ${rawUrl}`,
    );
  }

  return {
    platform: 'youtube',
    videoId,
  };
}

/**
 * Parse a Substack post URL into its components.
 *
 * Only `*.substack.com` URLs are supported; custom domains are rejected.
 * The URL must follow the `/p/<slug>` path format.
 *
 * @param rawUrl - Full Substack post URL (e.g. `https://example.substack.com/p/my-post`)
 * @returns Parsed publication name and post slug
 * @throws {@link ContentFundingCanonicalizationError} with code `invalid_substack_url` or `unsupported_substack_custom_domain`
 */
export function parseSubstackPostUrl(rawUrl: string): ParsedSubstackPostUrl {
  const url = parseUrl(rawUrl);
  const host = url.hostname.toLowerCase();

  if (!host.endsWith('.substack.com')) {
    throw new ContentFundingCanonicalizationError(
      'unsupported_substack_custom_domain',
      `Substack custom domains are not supported; use the *.substack.com URL instead: ${rawUrl}`,
    );
  }

  const labels = host.split('.');
  if (labels.length !== 3 || labels[1] !== 'substack' || labels[2] !== 'com') {
    throw new ContentFundingCanonicalizationError(
      'invalid_substack_url',
      `Substack URL must use a publication subdomain: ${rawUrl}`,
    );
  }

  const publication = labels[0];
  if (!SUBSTACK_PUBLICATION_PATTERN.test(publication)) {
    throw new ContentFundingCanonicalizationError(
      'invalid_substack_url',
      `Invalid Substack publication slug in URL: ${rawUrl}`,
    );
  }

  const segments = getPathSegments(url);
  if (segments.length !== 2 || segments[0] !== 'p' || !SUBSTACK_SLUG_PATTERN.test(segments[1])) {
    throw new ContentFundingCanonicalizationError(
      'invalid_substack_url',
      `Substack URL must point to a /p/<slug> post: ${rawUrl}`,
    );
  }

  return {
    platform: 'substack',
    publication,
    slug: segments[1],
  };
}

/**
 * Build a canonical channel ID string from a platform and stable identifier.
 *
 * Canonical channel ID formats:
 * - Twitter: `"twitter:uid:<numericUserId>"`
 * - YouTube: `"youtube:channel:<UCchannelId>"`
 * - Substack: `"substack:<publicationSlug>"`
 *
 * @param platform - Content platform
 * @param stableId - Platform-specific stable identifier
 * @returns Canonical channel ID string
 * @throws {@link ContentFundingCanonicalizationError} with code `invalid_channel_id`
 */
export function buildCanonicalChannelId(
  platform: ContentFundingPlatform,
  stableId: string,
): string {
  switch (platform) {
    case 'twitter':
      if (!TWITTER_CHANNEL_ID_PATTERN.test(stableId)) {
        throw new ContentFundingCanonicalizationError(
          'invalid_channel_id',
          `Twitter channel IDs must use numeric user IDs: ${stableId}`,
        );
      }
      return `twitter:uid:${stableId}`;
    case 'youtube':
      if (!YOUTUBE_CHANNEL_ID_PATTERN.test(stableId)) {
        throw new ContentFundingCanonicalizationError(
          'invalid_channel_id',
          `YouTube channel IDs must use UC-prefixed channel IDs: ${stableId}`,
        );
      }
      return `youtube:channel:${stableId}`;
    case 'substack': {
      const normalizedPublication = stableId.trim().toLowerCase();
      if (!SUBSTACK_PUBLICATION_PATTERN.test(normalizedPublication)) {
        throw new ContentFundingCanonicalizationError(
          'invalid_channel_id',
          `Substack channel IDs must use publication slugs: ${stableId}`,
        );
      }
      return `substack:${normalizedPublication}`;
    }
  }
}

/**
 * Parse a canonical channel ID string back into its platform and stable ID components.
 *
 * @param channelId - Canonical channel ID (e.g. `"twitter:uid:123"`, `"youtube:channel:UCxyz"`)
 * @returns Parsed platform and stable ID
 * @throws {@link ContentFundingCanonicalizationError} with code `invalid_channel_id`
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

  throw new ContentFundingCanonicalizationError(
    'invalid_channel_id',
    `Invalid canonical channel ID: ${channelId}`,
  );
}

/**
 * Build a canonical content ID by combining a channel ID with a content suffix.
 *
 * Content ID formats:
 * - Twitter: `"twitter:uid:<userId>:<tweetId>"`
 * - YouTube: `"youtube:channel:<channelId>:<videoId>"`
 * - Substack: `"substack:<publication>/<slug>"`
 *
 * @param channelId - Canonical channel ID
 * @param contentSuffix - Platform-specific content identifier (tweet ID, video ID, or post slug)
 * @returns Canonical content ID string
 * @throws {@link ContentFundingCanonicalizationError} with code `invalid_content_suffix`
 */
export function buildCanonicalContentId(channelId: string, contentSuffix: string): string {
  const parsedChannelId = parseCanonicalChannelId(channelId);

  switch (parsedChannelId.platform) {
    case 'twitter':
      if (!/^\d+$/.test(contentSuffix)) {
        throw new ContentFundingCanonicalizationError(
          'invalid_content_suffix',
          `Twitter content suffix must be a numeric tweet ID: ${contentSuffix}`,
        );
      }
      return `${channelId}:${contentSuffix}`;
    case 'youtube':
      if (!YOUTUBE_VIDEO_ID_PATTERN.test(contentSuffix)) {
        throw new ContentFundingCanonicalizationError(
          'invalid_content_suffix',
          `YouTube content suffix must be an 11-character video ID: ${contentSuffix}`,
        );
      }
      return `${channelId}:${contentSuffix}`;
    case 'substack':
      if (!SUBSTACK_SLUG_PATTERN.test(contentSuffix)) {
        throw new ContentFundingCanonicalizationError(
          'invalid_content_suffix',
          `Substack content suffix must be a publication post slug: ${contentSuffix}`,
        );
      }
      return `${channelId}/${contentSuffix}`;
  }
}

/**
 * Compute the keccak256 hash of a canonical ID string for on-chain storage.
 *
 * @param canonicalId - Canonical channel or content ID string
 * @returns 32-byte keccak256 hash as a hex string
 */
export function hashCanonicalId(canonicalId: string): Hex {
  return keccak256(stringToBytes(canonicalId));
}

/**
 * Extract the channel canonical ID from a content canonical ID.
 *
 * Content canonical ID formats:
 *   Twitter:   "twitter:uid:DIGITS:TWEETID"   → "twitter:uid:DIGITS"
 *   YouTube:   "youtube:channel:UCID:VIDEOID" → "youtube:channel:UCID"
 *   Substack:  "substack:PUB/SLUG"            → "substack:PUB"
 */
export function extractChannelCanonicalIdFromContentCanonicalId(contentCanonicalId: string): string {
  const slashIndex = contentCanonicalId.indexOf('/');
  if (slashIndex !== -1) {
    // Substack: "substack:pub/slug" → "substack:pub"
    return contentCanonicalId.slice(0, slashIndex);
  }
  const parts = contentCanonicalId.split(':');
  if (parts[0] === 'substack' && parts.length >= 3) {
    // Some local/seed deployments use the factory's ":" separator for all
    // platforms: "substack:pub:slug" → "substack:pub".
    return parts.slice(0, 2).join(':');
  }
  // Twitter / YouTube: "platform:type:id:suffix" → "platform:type:id"
  if (parts.length >= 4) {
    return parts.slice(0, 3).join(':');
  }
  throw new ContentFundingCanonicalizationError(
    'invalid_content_suffix',
    `Cannot extract channel canonical ID from content canonical ID: ${contentCanonicalId}`,
  );
}

function parseUrl(rawUrl: string): URL {
  try {
    return new URL(rawUrl);
  } catch {
    throw new ContentFundingCanonicalizationError(
      'invalid_url',
      `Invalid URL: ${rawUrl}`,
    );
  }
}

function getPathSegments(url: URL): string[] {
  return url.pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function normalizeTwitterHandle(handle: string, rawUrl: string): string {
  if (!TWITTER_HANDLE_PATTERN.test(handle)) {
    throw new ContentFundingCanonicalizationError(
      'invalid_twitter_url',
      `Twitter/X URL contains an invalid handle: ${rawUrl}`,
    );
  }

  return `@${handle.replace(/^@/, '')}`;
}

function requireTwitterTweetId(tweetId: string | undefined, rawUrl: string): string {
  if (!tweetId || !/^\d+$/.test(tweetId)) {
    throw new ContentFundingCanonicalizationError(
      'invalid_twitter_url',
      `Twitter/X URL must contain a numeric tweet ID: ${rawUrl}`,
    );
  }

  return tweetId;
}
