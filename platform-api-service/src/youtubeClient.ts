import {
  buildCanonicalChannelId,
  buildCanonicalContentId,
  parseCanonicalChannelId,
  parseYouTubeVideoUrl,
} from '@commonality/sdk';
import { HttpError } from './errors.js';
import type { PlatformApiServiceConfig } from './config.js';
import type {
  LocalContentContext,
  LocalContentContextRequest,
  ResolvedChannel,
  ResolvedContent,
  YouTubeClientLike,
  VerificationPostMatch,
} from './types.js';

interface YouTubeChannelsResponse {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      customUrl?: string;
    };
  }>;
}

interface YouTubeVideosResponse {
  items?: Array<{
    id?: string;
    snippet?: {
      channelId?: string;
      channelTitle?: string;
      title?: string;
      publishedAt?: string;
    };
  }>;
}

type NormalizedLookup =
  | { cacheKey: string; mode: 'id'; value: string }
  | { cacheKey: string; mode: 'handle'; value: string }
  | { cacheKey: string; mode: 'username'; value: string };

export class YouTubeClient implements YouTubeClientLike {
  constructor(private readonly config: PlatformApiServiceConfig) {}

  isConfigured(): boolean {
    return Boolean(this.config.youtubeApiKey);
  }

  normalizeLookupInput(input: string): string {
    return parseLookupInput(input).cacheKey;
  }

  async resolveChannel(input: string): Promise<ResolvedChannel> {
    this.ensureConfigured('YouTube channel resolution is unavailable because YOUTUBE_API_KEY is not set');

    const lookup = parseLookupInput(input);
    const response = await this.fetchJson<YouTubeChannelsResponse>(buildChannelsPath(lookup, this.config.youtubeApiKey!));

    const item = response.items?.[0];
    if (!item?.id) {
      throw new HttpError(404, 'channel_not_found', `YouTube channel not found for ${input}`);
    }

    const handle = lookup.mode === 'handle'
      ? `@${lookup.value}`
      : item.snippet?.customUrl
        ? normalizeHandleWithAt(item.snippet.customUrl)
        : undefined;

    return {
      platform: 'youtube',
      channelId: buildCanonicalChannelId('youtube', item.id),
      handle,
      displayName: item.snippet?.title,
    };
  }

  async resolveContent(url: string): Promise<ResolvedContent> {
    this.ensureConfigured('YouTube content validation is unavailable because YOUTUBE_API_KEY is not set');

    const parsedUrl = parseYouTubeVideoUrl(url);
    const response = await this.fetchJson<YouTubeVideosResponse>(
      `/videos?part=snippet&id=${encodeURIComponent(parsedUrl.videoId)}&key=${encodeURIComponent(this.config.youtubeApiKey!)}`,
    );

    const video = response.items?.[0];
    const snippet = video?.snippet;
    if (!video?.id || !snippet?.channelId) {
      throw new HttpError(404, 'content_not_found', `YouTube video not found for ${url}`);
    }

    const channelId = buildCanonicalChannelId('youtube', snippet.channelId);
    return {
      platform: 'youtube',
      channelId,
      contentSuffix: video.id,
      canonicalId: buildCanonicalContentId(channelId, video.id),
      metadata: {
        title: snippet.title,
        channelTitle: snippet.channelTitle,
        publishedAt: snippet.publishedAt,
      },
    };
  }

  async getLocalContentContext(request: LocalContentContextRequest): Promise<LocalContentContext> {
    const resolved = request.url
      ? await this.resolveContent(request.url)
      : resolveYouTubeCanonicalContentId(request.canonicalId);
    return {
      target: {
        platform: 'youtube',
        canonicalId: resolved.canonicalId,
        channelId: resolved.channelId,
        authorDisplayName: typeof resolved.metadata.channelTitle === 'string'
          ? resolved.metadata.channelTitle
          : undefined,
        text: typeof resolved.metadata.title === 'string' ? resolved.metadata.title : undefined,
        url: request.url,
        createdAt: typeof resolved.metadata.publishedAt === 'string'
          ? resolved.metadata.publishedAt
          : undefined,
        relationship: 'target',
      },
      parentPosts: [],
      quotedPosts: [],
      thread: [],
      replies: [],
      authorRecentPosts: [],
    };
  }

  async findVerificationPost(
    channelId: string,
    challengeCode: string,
    _issuedAfterMs: number,
  ): Promise<VerificationPostMatch | null> {
    this.ensureConfigured('YouTube verification is unavailable because YOUTUBE_API_KEY is not set');

    const parsedChannelId = parseCanonicalChannelId(channelId);
    if (parsedChannelId.platform !== 'youtube') {
      throw new HttpError(400, 'invalid_request', `Not a YouTube channel ID: ${channelId}`);
    }

    const response = await this.fetchJson<YouTubeVideosResponse>(
      `/search?part=snippet&channelId=${encodeURIComponent(parsedChannelId.stableId)}&order=date&maxResults=20&type=video&key=${encodeURIComponent(this.config.youtubeApiKey!)}`,
    );

    const matchingVideo = response.items?.find((video) => {
      const title = video.snippet?.title ?? '';
      const description = (video.snippet as { description?: string })?.description ?? '';
      return title.includes(challengeCode) || description.includes(challengeCode);
    });

    if (!matchingVideo?.id) {
      return null;
    }

    return {
      id: matchingVideo.id,
      text: `${matchingVideo.snippet?.title ?? ''}\n${(matchingVideo.snippet as { description?: string })?.description ?? ''}`,
      createdAt: matchingVideo.snippet?.publishedAt,
    };
  }

  private ensureConfigured(message: string): void {
    if (!this.config.youtubeApiKey) {
      throw new HttpError(503, 'service_unavailable', message);
    }
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const response = await fetch(`${this.config.youtubeApiBaseUrl}${path}`);
    if (response.status === 404) {
      throw new HttpError(404, 'not_found', 'YouTube resource not found');
    }

    if (!response.ok) {
      const body = await safeReadBody(response);
      throw new HttpError(
        502,
        'youtube_api_error',
        `YouTube API request failed with status ${response.status}`,
        { body },
      );
    }

    return await response.json() as T;
  }
}

function resolveYouTubeCanonicalContentId(canonicalId: string | undefined): ResolvedContent {
  const match = /^(youtube:channel:UC[A-Za-z0-9_-]+):([A-Za-z0-9_-]{11})$/.exec(canonicalId ?? '');
  if (!match) {
    throw new HttpError(400, 'invalid_request', `Invalid YouTube canonical content ID: ${canonicalId ?? ''}`);
  }
  return {
    platform: 'youtube',
    channelId: match[1],
    contentSuffix: match[2],
    canonicalId: canonicalId!,
    metadata: {},
  };
}

function parseLookupInput(input: string): NormalizedLookup {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new HttpError(400, 'invalid_request', 'YouTube handle is required');
  }

  if (looksLikeUrl(trimmed)) {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    if (!['youtube.com', 'www.youtube.com'].includes(host)) {
      throw new HttpError(400, 'invalid_request', `Not a YouTube channel URL: ${input}`);
    }

    const segments = url.pathname.split('/').filter(Boolean);
    if (segments[0] === 'channel' && segments[1]) {
      return {
        cacheKey: `id:${segments[1]}`,
        mode: 'id',
        value: segments[1],
      };
    }
    if (segments[0]?.startsWith('@')) {
      const handle = normalizeHandleWithoutAt(segments[0]);
      return {
        cacheKey: `handle:${handle.toLowerCase()}`,
        mode: 'handle',
        value: handle,
      };
    }
    if (segments[0] === 'user' && segments[1]) {
      return {
        cacheKey: `username:${segments[1].toLowerCase()}`,
        mode: 'username',
        value: segments[1],
      };
    }
    if (segments[0] === 'c' && segments[1]) {
      throw new HttpError(
        400,
        'invalid_request',
        'YouTube /c/ custom URLs are not supported yet; use a @handle, /user/, or /channel/ URL instead',
      );
    }
  }

  if (/^UC[A-Za-z0-9_-]+$/.test(trimmed)) {
    return {
      cacheKey: `id:${trimmed}`,
      mode: 'id',
      value: trimmed,
    };
  }

  if (/^@?[A-Za-z0-9._-]+$/.test(trimmed)) {
    const handle = normalizeHandleWithoutAt(trimmed);
    return {
      cacheKey: `handle:${handle.toLowerCase()}`,
      mode: 'handle',
      value: handle,
    };
  }

  throw new HttpError(400, 'invalid_request', `Unrecognized YouTube channel input: ${input}`);
}

function buildChannelsPath(lookup: NormalizedLookup, apiKey: string): string {
  switch (lookup.mode) {
    case 'id':
      return `/channels?part=snippet&id=${encodeURIComponent(lookup.value)}&key=${encodeURIComponent(apiKey)}`;
    case 'handle':
      return `/channels?part=snippet&forHandle=${encodeURIComponent(lookup.value)}&key=${encodeURIComponent(apiKey)}`;
    case 'username':
      return `/channels?part=snippet&forUsername=${encodeURIComponent(lookup.value)}&key=${encodeURIComponent(apiKey)}`;
  }
}

function normalizeHandleWithoutAt(value: string): string {
  return value.replace(/^@/, '');
}

function normalizeHandleWithAt(value: string): string {
  return value.startsWith('@') ? value : `@${value}`;
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
