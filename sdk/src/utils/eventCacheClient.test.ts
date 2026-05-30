import assert from 'assert';
import { fetchEvents } from './eventCacheClient.js';
import type { SDKMachinery } from '../machinery.js';

const machinery = {
  eventCacheUrl: 'http://indexer.example',
} as SDKMachinery;

describe('fetchEvents', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns the event-cache items array from a valid response', async () => {
    const event = {
      id: 'event-1',
      contractAddress: '0x1111111111111111111111111111111111111111',
      eventName: 'DirectSupport',
      blockNumber: '123',
      blockTimestamp: '1700000000',
      transactionHash: '0xabc',
      logIndex: 0,
      topic0: null,
      topic1: null,
      topic2: null,
      topic3: null,
      data: '0x',
    };

    globalThis.fetch = (async () => new Response(JSON.stringify({ items: [event] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

    const events = await fetchEvents(machinery, { eventName: 'DirectSupport' });

    assert.deepStrictEqual(events, [event]);
  });

  it('retries transient network failures before returning event-cache items', async () => {
    const event = {
      id: 'event-1',
      contractAddress: '0x1111111111111111111111111111111111111111',
      eventName: 'DirectSupport',
      blockNumber: '123',
      blockTimestamp: '1700000000',
      transactionHash: '0xabc',
      logIndex: 0,
      topic0: null,
      topic1: null,
      topic2: null,
      topic3: null,
      data: '0x',
    };
    let attempts = 0;

    globalThis.fetch = (async () => {
      attempts++;
      if (attempts === 1) {
        throw new TypeError('Failed to fetch');
      }
      return new Response(JSON.stringify({ items: [event] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    const events = await fetchEvents(machinery, { eventName: 'DirectSupport' });

    assert.strictEqual(attempts, 2);
    assert.deepStrictEqual(events, [event]);
  });

  it('retries transient HTTP failures before returning event-cache items', async () => {
    let attempts = 0;

    globalThis.fetch = (async () => {
      attempts++;
      if (attempts === 1) {
        return new Response('service restarting', { status: 503, statusText: 'Service Unavailable' });
      }
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    const events = await fetchEvents(machinery, { eventName: 'DirectSupport' });

    assert.strictEqual(attempts, 2);
    assert.deepStrictEqual(events, []);
  });

  it('throws a clear error instead of treating malformed indexer responses as empty state', async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

    await assert.rejects(
      fetchEvents(machinery, { eventName: 'DirectSupport' }),
      /Malformed event-cache response: expected object with items array/,
    );
  });

  it('throws a clear parse error for non-JSON indexer responses', async () => {
    globalThis.fetch = (async () => new Response('<html>not json</html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    })) as typeof fetch;

    await assert.rejects(
      fetchEvents(machinery, { eventName: 'DirectSupport' }),
      /Failed to parse event-cache response:/,
    );
  });
});
