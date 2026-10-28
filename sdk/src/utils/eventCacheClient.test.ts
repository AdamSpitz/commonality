import assert from 'assert';
import { fetchAllBoughtEvents, fetchAllContentFundingEvents, fetchAllDelegationEvents, fetchAllNoteIntentEvents, fetchAllRefUpdatedEvents, fetchAllSoldEvents, fetchERC1155TransferEvents, fetchEvents, fetchEventsComplete, fetchNoteIntentEvents } from './eventCacheClient.js';
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

  it('rejects an unfiltered page that fills its limit', async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({
      items: Array.from({ length: 1000 }, (_, index) => rawEvent('DirectSupport', 1, index)),
    }), { status: 200 })) as typeof fetch;

    await assert.rejects(
      fetchEvents(machinery, { eventName: 'DirectSupport' }),
      /meets the limit of 1000/,
    );
  });

  it('allows a full page when the query is narrowed by a topic', async () => {
    const items = Array.from({ length: 1000 }, (_, index) => rawEvent('DirectSupport', 1, index));
    globalThis.fetch = (async () => new Response(JSON.stringify({ items }), { status: 200 })) as typeof fetch;

    const events = await fetchEvents(machinery, { eventName: 'DirectSupport', topic1: '0x' + '11'.repeat(32) });

    assert.strictEqual(events.length, 1000);
  });
});

const PER_BLOCK = 6_000;

function rawEvent(eventName: string, blockNumber: number, logIndex: number) {
  return {
    id: `${eventName}-${blockNumber}-${logIndex}`,
    contractAddress: '0x1111111111111111111111111111111111111111',
    eventName,
    blockNumber: String(blockNumber),
    blockTimestamp: '1700000000',
    transactionHash: '0xabc',
    logIndex,
    topic0: null,
    topic1: null,
    topic2: null,
    topic3: null,
    data: eventName === 'NoteIntentAttested'
      ? `0x${'0'.repeat(24)}2222222222222222222222222222222222222222`
      : '0x',
  };
}

function installTruncatingCache() {
  const blocks = new Map<string, ReturnType<typeof rawEvent>[]>();
  const blockEvents = (key: string, blockNumber: number) => {
    const id = `${key}:${blockNumber}`;
    const existing = blocks.get(id);
    if (existing) return existing;
    const created = Array.from({ length: PER_BLOCK }, (_, logIndex) => rawEvent(key, blockNumber, logIndex));
    blocks.set(id, created);
    return created;
  };

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    const key = url.searchParams.get('eventName')
      ?? url.searchParams.get('contractAddress')
      ?? 'all';
    const gte = Number(url.searchParams.get('blockNumber_gte') ?? '0');
    const lte = url.searchParams.get('blockNumber_lte');
    const end = lte == null ? 3 : Number(lte);
    const included: ReturnType<typeof rawEvent>[] = [];
    for (let block = Math.max(gte, 1); block <= end; block++) {
      included.push(...blockEvents(key, block));
    }
    const limit = Number(url.searchParams.get('limit') ?? included.length);
    return new Response(JSON.stringify({ items: included.slice(-limit) }), { status: 200 });
  }) as typeof fetch;
}

describe('complete global fetches', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('splits a capped block range until every matching event is returned', async () => {
    installTruncatingCache();

    const events = await fetchEventsComplete(machinery, { eventName: 'DirectSupport' });

    assert.strictEqual(events.length, PER_BLOCK * 3);
  });

  const helpers: Array<[string, () => Promise<unknown[]>]> = [
    ['fetchAllDelegationEvents', () => fetchAllDelegationEvents(machinery)],
    ['fetchAllContentFundingEvents', () => fetchAllContentFundingEvents(machinery)],
    ['fetchAllRefUpdatedEvents', () => fetchAllRefUpdatedEvents(machinery)],
    ['fetchAllNoteIntentEvents', () => fetchAllNoteIntentEvents(machinery)],
    ['fetchNoteIntentEvents', () => fetchNoteIntentEvents(machinery, '0x2222222222222222222222222222222222222222')],
    ['fetchAllBoughtEvents', () => fetchAllBoughtEvents(machinery)],
    ['fetchAllSoldEvents', () => fetchAllSoldEvents(machinery)],
    ['fetchERC1155TransferEvents', () => fetchERC1155TransferEvents(machinery, '0x3333333333333333333333333333333333333333')],
  ];

  for (const [name, load] of helpers) {
    it(`${name} returns more than the 10k API cap`, async () => {
      installTruncatingCache();
      const events = await load();
      assert.ok(events.length > 10_000, `${name} returned ${events.length}`);
    });
  }
});
