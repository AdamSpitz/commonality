import { keccak256, stringToBytes, type Hex } from 'viem';

export type ContentFundingPlatform = 'twitter' | 'youtube' | 'substack';

export type ContentFundingCanonicalizationErrorCode =
  | 'invalid_url'
  | 'unsupported_platform'
  | 'invalid_twitter_url'
  | 'invalid_youtube_url'
  | 'invalid_substack_url'
  | 'unsupported_substack_custom_domain'
  | 'invalid_channel_id'
  | 'invalid_content_suffix';

export class ContentFundingCanonicalizationError extends Error {
  readonly code: ContentFundingCanonicalizationErrorCode;

  constructor(code: ContentFundingCanonicalizationErrorCode, message: string) {
    super(message);
    this.name = 'ContentFundingCanonicalizationError';
    this.code = code;
  }
}

export interface ParsedTwitterStatusUrl {
  platform: 'twitter';
  tweetId: string;
  handle?: string;
}

export interface ParsedYouTubeVideoUrl {
  platform: 'youtube';
  videoId: string;
}

export interface ParsedSubstackPostUrl {
  platform: 'substack';
  publication: string;
  slug: string;
}

export type ParsedContentFundingUrl =
  | ParsedTwitterStatusUrl
  | ParsedYouTubeVideoUrl
  | ParsedSubstackPostUrl;

export interface ParsedCanonicalChannelId {
  platform: ContentFundingPlatform;
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

export function hashCanonicalId(canonicalId: string): Hex {
  return keccak256(stringToBytes(canonicalId));
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
