import assert from 'assert';
import { afterEach, describe, it } from 'mocha';
import { TwitterClient } from './twitterClient.js';
import type { PlatformApiServiceConfig } from './config.js';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

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

  it('builds local context from referenced tweets and author recent posts', async () => {
    const requestedUrls: string[] = [];
    globalThis.fetch = (async (url: string | URL | Request) => {
      requestedUrls.push(String(url));
      if (String(url).includes('/2/tweets/18347')) {
        return jsonResponse({
          data: {
            id: '18347',
            text: 'Target post',
            author_id: '12345678',
            created_at: '2026-05-15T12:00:00Z',
            referenced_tweets: [
              { type: 'replied_to', id: '18346' },
              { type: 'quoted', id: '999' },
            ],
          },
          includes: {
            tweets: [
              {
                id: '18346',
                text: 'Parent post',
                author_id: '12345678',
                created_at: '2026-05-15T11:59:00Z',
              },
              {
                id: '999',
                text: 'Quoted post',
                author_id: '555',
                created_at: '2026-05-14T00:00:00Z',
              },
            ],
            users: [
              { id: '12345678', name: 'Alice', username: 'alice' },
              { id: '555', name: 'Bob', username: 'bob' },
            ],
          },
        });
      }

      if (String(url).includes('/2/users/12345678/tweets')) {
        return jsonResponse({
          data: [
            {
              id: '18347',
              text: 'Target post',
              author_id: '12345678',
              created_at: '2026-05-15T12:00:00Z',
            },
            {
              id: '18345',
              text: 'Recent author post',
              author_id: '12345678',
              created_at: '2026-05-15T10:00:00Z',
            },
          ],
          includes: {
            users: [{ id: '12345678', name: 'Alice', username: 'alice' }],
          },
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    }) as typeof fetch;

    const context = await new TwitterClient(baseConfig).getLocalContentContext({
      url: 'https://x.com/alice/status/18347',
      authorRecentLimit: 5,
    });

    assert.deepStrictEqual(requestedUrls, [
      'https://api.x.test/2/tweets/18347?expansions=author_id,referenced_tweets.id,referenced_tweets.id.author_id&tweet.fields=author_id,conversation_id,created_at,referenced_tweets,text&user.fields=id,name,username',
      'https://api.x.test/2/users/12345678/tweets?max_results=5&tweet.fields=author_id,created_at,text&user.fields=id,name,username&expansions=author_id',
    ]);
    assert.strictEqual(context.target.canonicalId, 'twitter:uid:12345678:18347');
    assert.strictEqual(context.parentPosts[0]?.canonicalId, 'twitter:uid:12345678:18346');
    assert.strictEqual(context.quotedPosts[0]?.canonicalId, 'twitter:uid:555:999');
    assert.deepStrictEqual(context.authorRecentPosts.map((post) => post.canonicalId), [
      'twitter:uid:12345678:18345',
    ]);
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
