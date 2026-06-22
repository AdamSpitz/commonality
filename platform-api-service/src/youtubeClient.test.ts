import assert from 'assert';
import { describe, it } from 'mocha';
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
};

describe('YouTubeClient', () => {
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
});
