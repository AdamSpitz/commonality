import assert from 'assert';
import { afterEach, describe, it } from 'mocha';
import { YouTubeClient } from './youtubeClient.js';
import type { PlatformApiServiceConfig } from './config.js';

const baseConfig: PlatformApiServiceConfig = {
  port: 3001,
  corsAllowedOrigins: '*',
  commonalityTwitterHandle: '@commonality',
  contentSubmissionsFilePath: './submissions.json',
  xApiBaseUrl: 'https://api.x.test',
  youtubeApiKey: 'test-key',
  youtubeApiBaseUrl: 'https://youtube.test',
  submitVerificationTx: false,
  challengeTtlSeconds: 1800,
  contentCacheTtlSeconds: 3600,
  resolveRateLimitWindowMs: 60_000,
  resolveRateLimitMaxRequests: 60,
  verifyRateLimitWindowMs: 60_000,
  verifyRateLimitMaxRequests: 5,
  submissionRateLimitWindowMs: 60_000,
  submissionRateLimitMaxRequests: 10,
  onrampRateLimitWindowMs: 60_000,
  onrampRateLimitMaxRequests: 10,
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('YouTubeClient', () => {
  afterEach(() => {
    delete (globalThis as { fetch?: typeof fetch }).fetch;
  });

  it('rejects video URLs for channel resolution instead of silently treating them as handles', async () => {
    await assert.rejects(
      () => new YouTubeClient(baseConfig).resolveChannel('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
      (error: unknown) =>
        error instanceof Error &&
        error.message === 'YouTube channel resolution requires a channel URL or handle, not a video URL',
    );
  });

  it('rejects handle-scoped video URLs for channel resolution', async () => {
    await assert.rejects(
      () => new YouTubeClient(baseConfig).resolveChannel('https://www.youtube.com/@alice/videos'),
      (error: unknown) =>
        error instanceof Error &&
        error.message === 'Unrecognized YouTube channel input: https://www.youtube.com/@alice/videos',
    );
  });

  it('rejects conflicting YouTube channel-id responses for canonical channel lookups', async () => {
    globalThis.fetch = (async () => jsonResponse({
      items: [
        {
          id: 'UCwrongChannel',
          snippet: { title: 'Wrong channel', customUrl: '@wrong' },
        },
      ],
    })) as typeof fetch;

    await assert.rejects(
      () => new YouTubeClient(baseConfig).resolveChannel('UCuAXFkgsw1L7xaCfnd5JJOw'),
      (error: unknown) =>
        error instanceof Error &&
        error.message === 'YouTube API returned channel UCwrongChannel for requested channel UCuAXFkgsw1L7xaCfnd5JJOw',
    );
  });

  it('rejects ambiguous YouTube channel-resolution responses', async () => {
    globalThis.fetch = (async () => jsonResponse({
      items: [
        { id: 'UCfirstChannel', snippet: { title: 'First', customUrl: '@first' } },
        { id: 'UCsecondChannel', snippet: { title: 'Second', customUrl: '@second' } },
      ],
    })) as typeof fetch;

    await assert.rejects(
      () => new YouTubeClient(baseConfig).resolveChannel('@common-name'),
      (error: unknown) =>
        error instanceof Error &&
        error.message === 'YouTube API returned multiple channels for @common-name',
    );
  });
});
