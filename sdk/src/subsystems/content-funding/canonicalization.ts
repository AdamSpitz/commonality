import { getDomain } from 'tldts';
import type { Hex } from 'viem';
import { hashCanonicalId } from '../../content-identity/ids.js';
import type { ContentPlatform } from '../../content-identity/ids.js';

export {
  ContentIdentityError,
  buildCanonicalChannelId,
  buildCanonicalContentId,
  extractChannelCanonicalIdFromContentCanonicalId,
  hashCanonicalId,
  parseCanonicalChannelId,
} from '../../content-identity/ids.js';
export type { ParsedCanonicalChannelId } from '../../content-identity/ids.js';

/** Supported content platforms for the content-funding subsystem. */
export type ContentFundingPlatform = ContentPlatform;

/** Error codes for content-funding URL/ID canonicalization failures. */
export type ContentFundingCanonicalizationErrorCode =
  | 'invalid_url'
  | 'unsupported_platform'
  | 'invalid_twitter_url'
  | 'invalid_youtube_url'
  | 'invalid_substack_url'
  | 'unsupported_substack_custom_domain'
  | 'invalid_channel_id'
  | 'invalid_content_suffix'
  | 'invalid_domain_redirect';

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

const TWITTER_HOSTS = new Set(['twitter.com', 'www.twitter.com', 'x.com', 'www.x.com']);
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com']);
const YOUTUBE_SHORT_HOSTS = new Set(['youtu.be']);
const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const TWITTER_HANDLE_PATTERN = /^@?[A-Za-z0-9_]{1,15}$/;
const SUBSTACK_PUBLICATION_PATTERN = /^[a-z0-9-]+$/;
const SUBSTACK_SLUG_PATTERN = /^[A-Za-z0-9-]+$/;

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
 * Build the canonical string whose hash identifies a claimable beneficiary.
 *
 * The namespace selects the identity system and verifier; the canonical
 * identifier is namespace-specific (for example `uid:44196397` or
 * `example.org`). Keeping this primitive independent of content channels lets
 * projects target websites and future public identities through the same
 * registry and escrow.
 */
export function buildCanonicalBeneficiaryId(
  namespace: string,
  canonicalIdentifier: string,
): string {
  const normalizedNamespace = namespace.trim().toLowerCase();
  if (!/^[a-z][a-z0-9-]*$/.test(normalizedNamespace)) {
    throw new ContentFundingCanonicalizationError(
      'invalid_channel_id',
      `Invalid beneficiary namespace: ${namespace}`,
    );
  }
  if (canonicalIdentifier.length === 0 || canonicalIdentifier !== canonicalIdentifier.trim()) {
    throw new ContentFundingCanonicalizationError(
      'invalid_channel_id',
      `Invalid canonical beneficiary identifier: ${canonicalIdentifier}`,
    );
  }
  return `${normalizedNamespace}:${canonicalIdentifier}`;
}

/** Hash a namespaced canonical beneficiary identifier for on-chain storage. */
export function hashBeneficiaryId(namespace: string, canonicalIdentifier: string): Hex {
  return hashCanonicalId(buildCanonicalBeneficiaryId(namespace, canonicalIdentifier));
}

/**
 * Normalize the website identity accepted by the DNS beneficiary verifier.
 * Apex domains and their `www` spelling identify the same beneficiary; paths,
 * subdomains, public suffixes, and non-HTTPS URLs are deliberately rejected.
 */
export function normalizeDnsBeneficiary(input: string): string {
  const trimmed = input.trim();
  let hostname: string;
  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) {
      throw new Error('invalid domain URL');
    }
    hostname = url.hostname.replace(/^www\./i, '').replace(/\.$/, '').toLowerCase();
  } catch {
    throw new ContentFundingCanonicalizationError(
      'invalid_channel_id',
      `Invalid beneficiary domain: ${input}`,
    );
  }

  const registrableDomain = getDomain(hostname, { allowPrivateDomains: false });
  if (!registrableDomain || registrableDomain !== hostname) {
    throw new ContentFundingCanonicalizationError(
      'invalid_channel_id',
      `Beneficiary must be a registrable domain: ${input}`,
    );
  }
  return registrableDomain;
}

/**
 * Registrable domain of an HTTPS URL, or null if the URL is not a usable public
 * HTTPS location. `www` and apex collapse to the same registrable name.
 */
export function registrableHttpsDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
      return null;
    }
    return getDomain(parsed.hostname, { allowPrivateDomains: false });
  } catch {
    return null;
  }
}

/**
 * Refuse a fetch that landed on a different registrable domain than the
 * beneficiary being named. Same-domain hops (including `www`) are allowed.
 */
export function assertDnsRedirectStaysOnDomain(finalUrl: string, expectedDomain: string): void {
  const finalDomain = registrableHttpsDomain(finalUrl);
  if (finalDomain !== expectedDomain) {
    throw new ContentFundingCanonicalizationError(
      'invalid_domain_redirect',
      `Website redirected to a different registrable domain (${finalUrl})`,
    );
  }
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
