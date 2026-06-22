import {
  buildCanonicalChannelId,
  buildCanonicalContentId,
  parseCanonicalChannelId,
  parseTwitterStatusUrl,
} from '@commonality/sdk';
import { HttpError } from './errors.js';
import type { PlatformApiServiceConfig } from './config.js';
import type {
  LocalContentContext,
  LocalContentContextRequest,
  PlatformContentItem,
  ResolvedChannel,
  ResolvedContent,
  TwitterClientLike,
  VerificationPostMatch,
} from './types.js';

interface TwitterUserLookupResponse {
  data?: {
    id?: string;
    name?: string;
    username?: string;
    public_metrics?: {
      followers_count?: number;
    };
  };
}

interface TwitterTweet {
  id?: string;
  text?: string;
  author_id?: string;
  created_at?: string;
  conversation_id?: string;
  referenced_tweets?: Array<{
    type?: 'replied_to' | 'quoted' | 'retweeted';
    id?: string;
  }>;
}

interface TwitterUser {
  id?: string;
  name?: string;
  username?: string;
}

interface TwitterTweetLookupResponse {
  data?: TwitterTweet;
  includes?: {
    tweets?: TwitterTweet[];
    users?: TwitterUser[];
  };
}

interface TwitterTimelineResponse {
  data?: TwitterTweet[];
  includes?: {
    users?: TwitterUser[];
  };
}

export class TwitterClient implements TwitterClientLike {
  constructor(private readonly config: PlatformApiServiceConfig) {}

  isConfigured(): boolean {
    return Boolean(this.config.xApiBearerToken);
  }

  normalizeLookupInput(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) {
      throw new HttpError(400, 'invalid_request', 'Twitter handle is required');
    }

    if (looksLikeUrl(trimmed)) {
      const url = new URL(trimmed);
      const host = url.hostname.toLowerCase();
      if (!['twitter.com', 'www.twitter.com', 'x.com', 'www.x.com'].includes(host)) {
        throw new HttpError(400, 'invalid_request', `Not a Twitter/X URL: ${input}`);
      }

      const segments = url.pathname.split('/').filter(Boolean);
      if (!segments[0] || segments[0] === 'i' || segments.length > 1) {
        throw new HttpError(
          400,
          'invalid_request',
          'Twitter channel resolution requires a profile URL or handle, not a tweet or system URL',
        );
      }

      return normalizeTwitterHandle(segments[0]);
    }

    const canonicalMatch = /^twitter:uid:(\d+)$/.exec(trimmed)
    if (canonicalMatch) return canonicalMatch[1]

    if (/^\d+$/.test(trimmed)) return trimmed

    return normalizeTwitterHandle(trimmed);
  }

  async resolveChannel(input: string): Promise<ResolvedChannel> {
    this.ensureConfigured('Twitter channel resolution is unavailable because X_API_BEARER_TOKEN is not set');

    const normalizedLookup = this.normalizeLookupInput(input);
    const response = await this.fetchJson<TwitterUserLookupResponse>(
      /^\d+$/.test(normalizedLookup)
        ? `/2/users/${encodeURIComponent(normalizedLookup)}?user.fields=id,name,username,public_metrics`
        : `/2/users/by/username/${encodeURIComponent(normalizedLookup.slice(1))}?user.fields=id,name,username,public_metrics`,
    );

    const user = response.data;
    if (!user?.id || !user.username) {
      throw new HttpError(404, 'channel_not_found', `Twitter account not found for ${normalizedLookup}`);
    }

    return {
      platform: 'twitter',
      channelId: buildCanonicalChannelId('twitter', user.id),
      handle: `@${user.username}`,
      displayName: user.name,
      followerCount: typeof user.public_metrics?.followers_count === 'number'
        ? user.public_metrics.followers_count
        : undefined,
    };
  }

  async resolveContent(url: string): Promise<ResolvedContent> {
    this.ensureConfigured('Twitter content validation is unavailable because X_API_BEARER_TOKEN is not set');

    const parsedUrl = parseTwitterStatusUrl(url);
    const response = await this.fetchJson<TwitterTweetLookupResponse>(
      `/2/tweets/${encodeURIComponent(parsedUrl.tweetId)}?expansions=author_id&tweet.fields=created_at,text&user.fields=id,name,username`,
    );

    const tweet = response.data;
    const author = response.includes?.users?.find((user) => user.id === tweet?.author_id);
    if (!tweet?.id || !tweet.author_id || !author?.id || !author.username) {
      throw new HttpError(404, 'content_not_found', `Tweet not found for ${url}`);
    }

    const channelId = buildCanonicalChannelId('twitter', author.id);
    return {
      platform: 'twitter',
      channelId,
      contentSuffix: tweet.id,
      canonicalId: buildCanonicalContentId(channelId, tweet.id),
      metadata: {
        authorHandle: `@${author.username}`,
        authorDisplayName: author.name,
        text: tweet.text ?? '',
        createdAt: tweet.created_at,
      },
    };
  }

  async getLocalContentContext(request: LocalContentContextRequest): Promise<LocalContentContext> {
    this.ensureConfigured('Twitter local-context lookup is unavailable because X_API_BEARER_TOKEN is not set');

    const tweetId = getTwitterTweetIdForLocalContext(request);
    const targetResponse = await this.fetchJson<TwitterTweetLookupResponse>(
      `/2/tweets/${encodeURIComponent(tweetId)}?expansions=author_id,referenced_tweets.id,referenced_tweets.id.author_id&tweet.fields=author_id,conversation_id,created_at,referenced_tweets,text&user.fields=id,name,username`,
    );

    const target = tweetToContentItem(targetResponse.data, targetResponse.includes?.users, 'target');
    if (!target) {
      throw new HttpError(404, 'content_not_found', `Tweet not found for ${request.url ?? request.canonicalId}`);
    }

    const parentPosts = (targetResponse.includes?.tweets ?? [])
      .filter((tweet) => targetResponse.data?.referenced_tweets?.some(
        (reference) => reference.type === 'replied_to' && reference.id === tweet.id,
      ))
      .map((tweet) => tweetToContentItem(tweet, targetResponse.includes?.users, 'parent_post'))
      .filter(isDefined);
    const quotedPosts = (targetResponse.includes?.tweets ?? [])
      .filter((tweet) => targetResponse.data?.referenced_tweets?.some(
        (reference) => reference.type === 'quoted' && reference.id === tweet.id,
      ))
      .map((tweet) => tweetToContentItem(tweet, targetResponse.includes?.users, 'quote'))
      .filter(isDefined);

    const authorRecentPosts = target.channelId
      ? await this.getAuthorRecentPosts(target.channelId, request.authorRecentLimit ?? 10, target.canonicalId)
      : [];

    return {
      target,
      parentPosts,
      quotedPosts,
      thread: [],
      replies: [],
      authorRecentPosts,
    };
  }

  async findVerificationPost(
    channelId: string,
    challengeCode: string,
    issuedAfterMs: number,
  ): Promise<VerificationPostMatch | null> {
    this.ensureConfigured('Twitter verification is unavailable because X_API_BEARER_TOKEN is not set');

    const parsedChannelId = parseCanonicalChannelId(channelId);
    if (parsedChannelId.platform !== 'twitter') {
      throw new HttpError(400, 'invalid_request', `Not a Twitter channel ID: ${channelId}`);
    }

    const response = await this.fetchJson<TwitterTimelineResponse>(
      `/2/users/${encodeURIComponent(parsedChannelId.stableId)}/tweets?max_results=20&tweet.fields=created_at,text`,
    );

    const matchingTweet = response.data?.find((tweet) => {
      if (!tweet.id || !tweet.text?.includes(challengeCode)) {
        return false;
      }

      if (!tweet.created_at) {
        return true;
      }

      return Date.parse(tweet.created_at) >= issuedAfterMs - 60_000;
    });

    if (!matchingTweet?.id || !matchingTweet.text) {
      return null;
    }

    return {
      id: matchingTweet.id,
      text: matchingTweet.text,
      createdAt: matchingTweet.created_at,
    };
  }

  private async getAuthorRecentPosts(
    channelId: string,
    limit: number,
    targetCanonicalId: string,
  ): Promise<PlatformContentItem[]> {
    const parsedChannelId = parseCanonicalChannelId(channelId);
    if (parsedChannelId.platform !== 'twitter') {
      return [];
    }

    const boundedLimit = Math.min(Math.max(Math.floor(limit), 0), 20);
    if (boundedLimit === 0) {
      return [];
    }

    const response = await this.fetchJson<TwitterTimelineResponse>(
      `/2/users/${encodeURIComponent(parsedChannelId.stableId)}/tweets?max_results=${boundedLimit}&tweet.fields=author_id,created_at,text&user.fields=id,name,username&expansions=author_id`,
    );

    return (response.data ?? [])
      .map((tweet) => tweetToContentItem(tweet, response.includes?.users, 'author_recent_post'))
      .filter(isDefined)
      .filter((item) => item.canonicalId !== targetCanonicalId);
  }

  private ensureConfigured(message: string): void {
    if (!this.config.xApiBearerToken) {
      throw new HttpError(503, 'service_unavailable', message);
    }
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const response = await fetch(`${this.config.xApiBaseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.config.xApiBearerToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      throw new HttpError(404, 'not_found', 'Twitter resource not found');
    }

    if (!response.ok) {
      const body = await safeReadBody(response);
      throw new HttpError(
        502,
        'twitter_api_error',
        `Twitter API request failed with status ${response.status}`,
        { body },
      );
    }

    return await response.json() as T;
  }
}

function tweetToContentItem(
  tweet: TwitterTweet | undefined,
  users: TwitterUser[] | undefined,
  relationship: PlatformContentItem['relationship'],
): PlatformContentItem | undefined {
  if (!tweet?.id) {
    return undefined;
  }

  const author = users?.find((user) => user.id === tweet.author_id);
  const channelId = tweet.author_id ? buildCanonicalChannelId('twitter', tweet.author_id) : undefined;
  return {
    platform: 'twitter',
    canonicalId: channelId ? buildCanonicalContentId(channelId, tweet.id) : `twitter:unknown:${tweet.id}`,
    channelId,
    authorHandle: author?.username ? `@${author.username}` : undefined,
    authorDisplayName: author?.name,
    text: tweet.text ?? '',
    url: author?.username ? `https://x.com/${author.username}/status/${tweet.id}` : undefined,
    createdAt: tweet.created_at,
    relationship,
  };
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function getTwitterTweetIdForLocalContext(request: LocalContentContextRequest): string {
  if (request.url) {
    return parseTwitterStatusUrl(request.url).tweetId;
  }

  const match = /^twitter:uid:\d+:(\d+)$/.exec(request.canonicalId ?? '');
  if (!match) {
    throw new HttpError(400, 'invalid_request', `Invalid Twitter canonical content ID: ${request.canonicalId ?? ''}`);
  }
  return match[1];
}

function normalizeTwitterHandle(value: string): string {
  const normalized = value.trim();
  if (!/^@?[A-Za-z0-9_]{1,15}$/.test(normalized)) {
    throw new HttpError(400, 'invalid_request', `Invalid Twitter handle: ${value}`);
  }

  return normalized.startsWith('@') ? normalized : `@${normalized}`;
}

function looksLikeUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}

async function safeReadBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}
