import assert from 'assert';
import { fetchFollowerCountForTwitterHandle } from './twitter.js';

describe('fetchFollowerCountForTwitterHandle', () => {
  it('uses the platform API service follower count', async () => {
    const originalFetch = globalThis.fetch;
    const seenRequests: Array<{ url: string; init?: RequestInit }> = [];

    globalThis.fetch = (async (input, init) => {
      seenRequests.push({ url: String(input), init });
      return new Response(JSON.stringify({ followerCount: 321 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      const count = await fetchFollowerCountForTwitterHandle(
        { platformApiBaseUrl: 'http://localhost:3001' },
        'alice',
      );

      assert.strictEqual(count, 321);
      assert.deepStrictEqual(seenRequests, [{
        url: 'http://localhost:3001/resolve/channel',
        init: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform: 'twitter',
            handle: '@alice',
          }),
        },
      }]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns undefined when the platform API is unavailable', async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => new Response('service unavailable', { status: 503 })) as typeof fetch;

    try {
      const count = await fetchFollowerCountForTwitterHandle(
        { platformApiBaseUrl: 'http://localhost:3001' },
        '@alice',
      );

      assert.strictEqual(count, undefined);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
