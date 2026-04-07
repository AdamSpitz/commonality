import {
  buildCanonicalChannelId,
  buildCanonicalContentId,
  parseCanonicalChannelId,
  parseTwitterStatusUrl,
} from '@commonality/sdk';
import { HttpError } from './errors.js';
import type { PlatformApiServiceConfig } from './config.js';
import type { ResolvedChannel, ResolvedContent, TwitterClientLike, VerificationPostMatch } from './types.js';

interface TwitterUserLookupResponse {
  data?: {
    id?: string;
    name?: string;
    username?: string;
  };
}

interface TwitterTweetLookupResponse {
  data?: {
    id?: string;
    text?: string;
    author_id?: string;
    created_at?: string;
  };
  includes?: {
    users?: Array<{
      id?: string;
      name?: string;
      username?: string;
    }>;
  };
}

interface TwitterTimelineResponse {
  data?: Array<{
    id?: string;
    text?: string;
    created_at?: string;
  }>;
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
      if (!segments[0] || segments[0] === 'i') {
        throw new HttpError(
          400,
          'invalid_request',
          'Twitter channel resolution requires a profile URL or handle, not a system URL',
        );
      }

      return normalizeTwitterHandle(segments[0]);
    }

    return normalizeTwitterHandle(trimmed);
  }

  async resolveChannel(input: string): Promise<ResolvedChannel> {
    this.ensureConfigured('Twitter channel resolution is unavailable because X_API_BEARER_TOKEN is not set');

    const normalizedHandle = this.normalizeLookupInput(input);
    const username = normalizedHandle.slice(1);
    const response = await this.fetchJson<TwitterUserLookupResponse>(
      `/2/users/by/username/${encodeURIComponent(username)}?user.fields=id,name,username`,
    );

    const user = response.data;
    if (!user?.id || !user.username) {
      throw new HttpError(404, 'channel_not_found', `Twitter account not found for ${normalizedHandle}`);
    }

    return {
      platform: 'twitter',
      channelId: buildCanonicalChannelId('twitter', user.id),
      handle: `@${user.username}`,
      displayName: user.name,
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
