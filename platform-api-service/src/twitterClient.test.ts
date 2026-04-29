import assert from 'assert';
import { afterEach, describe, it } from 'mocha';
import { TwitterClient } from './twitterClient.js';
import type { PlatformApiServiceConfig } from './config.js';

const baseConfig: PlatformApiServiceConfig = {
  port: 3001,
  corsAllowedOrigins: '*',
  commonalityTwitterHandle: '@commonality',
  contentSubmissionsFilePath: './submissions.json',
  xApiBearerToken: 'test-token',
  xApiBaseUrl: 'https://api.x.test',
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

describe('TwitterClient', () => {
  afterEach(() => {
    delete (globalThis as { fetch?: typeof fetch }).fetch;
  });

  it('resolves canonical twitter:uid channel IDs through the user-id endpoint', async () => {
    let requestedUrl = '';
    globalThis.fetch = (async (url: string | URL | Request) => {
      requestedUrl = String(url);
      return new Response(JSON.stringify({
        data: {
          id: '111111111',
          name: 'Civic Builder',
          username: 'civicbuilder',
          public_metrics: { followers_count: 1234 },
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;

    const resolved = await new TwitterClient(baseConfig).resolveChannel('twitter:uid:111111111');

    assert.strictEqual(
      requestedUrl,
      'https://api.x.test/2/users/111111111?user.fields=id,name,username,public_metrics',
    );
    assert.deepStrictEqual(resolved, {
      platform: 'twitter',
      channelId: 'twitter:uid:111111111',
      handle: '@civicbuilder',
      displayName: 'Civic Builder',
      followerCount: 1234,
    });
  });
});
