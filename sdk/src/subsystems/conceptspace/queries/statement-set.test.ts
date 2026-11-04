import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'mocha';
import type { SDKMachinery } from '../../../machinery.js';
import type { IpfsCidV1 } from '../../../utils/cid-types.js';
import { MemoryFoldStore } from '../../../utils/resumableFold.js';
import { readStatementSet, statementSetSupportFromEvents } from './statement-set.js';
import type { DecodedDirectSupportEvent, DecodedImplicationAttestationEvent } from '../../../utils/event-decoders/conceptspace.js';

const targetA = 'bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as IpfsCidV1;
const targetB = 'bafybeibbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as IpfsCidV1;
const source = 'bafybeicccccccccccccccccccccccccccccccccccccccccccccccccccc' as IpfsCidV1;
const user = (n: number) => `0x${n.toString(16).padStart(40, '0')}` as const;

function belief(
  statementId: string,
  address: `0x${string}`,
  beliefState: number,
  blockNumber: bigint,
  logIndex = 0,
): DecodedDirectSupportEvent {
  return {
    user: address,
    statementId,
    beliefState,
    contractAddress: '0x00000000000000000000000000000000000000b1',
    blockNumber,
    blockTimestamp: 1n,
    transactionHash: '0x11',
    logIndex,
  };
}

function implication(from: string, to: string, attester = user(9)): DecodedImplicationAttestationEvent {
  return {
    attester,
    fromStatementCid: from,
    toStatementCid: to,
    explanationCid: source,
    contractAddress: '0x00000000000000000000000000000000000000c1',
    blockNumber: 1n,
    blockTimestamp: 1n,
    transactionHash: '0x22',
    logIndex: 0,
  };
}

describe('statementSetSupportFromEvents', () => {
  it('shares a source across targets and keeps indirect support disjoint from direct signers', () => {
    const counts = statementSetSupportFromEvents({
      targets: [targetA, targetB],
      implications: [implication(source, targetA), implication(source, targetB)],
      directSupport: [
        belief(targetA, user(1), 1, 2n),
        belief(targetA, user(2), 2, 2n),
        belief(source, user(1), 1, 3n),
        belief(source, user(2), 1, 3n),
        belief(source, user(3), 1, 3n),
        belief(targetB, user(4), 1, 4n),
      ],
    });

    assert.deepEqual(counts, [
      { statementCid: targetA, directSigners: 1, indirectOnlySupporters: 1, totalSupporters: 2 },
      { statementCid: targetB, directSigners: 1, indirectOnlySupporters: 3, totalSupporters: 4 },
    ]);
  });

  it('drops untrusted and retracted sources, and a later no-opinion clears a signer', () => {
    const counts = statementSetSupportFromEvents({
      targets: [targetA],
      trustedAttesters: [user(9)],
      retractedSources: new Set([source]),
      implications: [
        implication(source, targetA, user(9)),
        implication(targetB, targetA, user(8)),
      ],
      directSupport: [
        belief(targetA, user(1), 1, 1n, 0),
        belief(targetA, user(1), 0, 2n, 1),
        belief(targetB, user(5), 1, 1n),
      ],
    });
    assert.deepEqual(counts, [
      { statementCid: targetA, directSigners: 0, indirectOnlySupporters: 0, totalSupporters: 0 },
    ]);
  });
});

describe('readStatementSet', () => {
  const originalFetch = globalThis.fetch;
  const machinery = {
    eventCacheUrl: 'http://indexer.example',
    defaultChainId: 84532,
    contractAddresses: {
      beliefs: '0x00000000000000000000000000000000000000b1',
      implications: '0x00000000000000000000000000000000000000c1',
    },
    foldStore: new MemoryFoldStore(),
  } as unknown as SDKMachinery;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('does not read events before the indexer is ready', async () => {
    const seen: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      seen.push(String(input));
      return new Response(JSON.stringify({ ready: false, chains: [] }), { status: 200 });
    }) as typeof fetch;

    const read = await readStatementSet(machinery, [targetA]);
    assert.equal(read.status, 'not-ready');
    assert.equal(read.targets.length, 0);
    assert.equal(seen.length, 1);
    assert.match(seen[0] ?? '', /\/api\/sync/);
  });

  it('freezes target batches at the finalized checkpoint and does not repeat a target', async () => {
    const topics: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/sync')) {
        return new Response(JSON.stringify({
          ready: true,
          chains: [{
            chainId: '84532',
            chainName: 'base-sepolia',
            indexedThrough: '20',
            finalizedThrough: '12',
            indexedCheckpoint: 'indexed',
            finalizedCheckpoint: 'finalized-head',
          }],
        }), { status: 200 });
      }
      topics.push(`${url.searchParams.get('eventName')}:${url.searchParams.get('topic2_in') ?? ''}:${url.searchParams.get('topic3_in') ?? ''}`);
      assert.equal(url.searchParams.get('follow'), '1');
      assert.equal(url.searchParams.get('checkpoint'), 'finalized-head');
      return new Response(JSON.stringify({
        items: [],
        truncated: false,
        nextCursor: null,
        checkpoint: 'finalized-head',
        completeThroughCheckpoint: true,
      }), { status: 200 });
    }) as typeof fetch;

    const read = await readStatementSet(machinery, [targetA, targetA]);
    assert.equal(read.status, 'complete');
    assert.equal(read.asOfBlock, '12');
    assert.equal(read.checkpoint, 'finalized-head');
    assert.equal(read.targets[0]?.directSigners, 0);
    assert.equal(read.targets.length, 1);
    assert.deepEqual(topics.map(topic => topic.split(':')[0]), [
      'ImplicationAttestation',
      'ImplicationRevoked',
      'DirectSupport',
    ]);
    assert.equal(topics.filter(topic => topic.startsWith('DirectSupport:')).length, 1);
  });

  it('reuses a completed scan and fetches only later blocks', async () => {
    const store = new MemoryFoldStore();
    const scoped = { ...machinery, foldStore: store } as unknown as SDKMachinery;
    let head = '12';
    const gte: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/sync')) {
        return new Response(JSON.stringify({
          ready: true,
          chains: [{
            chainId: '84532',
            chainName: 'base-sepolia',
            indexedThrough: head,
            finalizedThrough: head,
            indexedCheckpoint: head,
            finalizedCheckpoint: head,
          }],
        }), { status: 200 });
      }
      gte.push(url.searchParams.get('blockNumber_gte') ?? 'start');
      return new Response(JSON.stringify({
        items: [],
        truncated: false,
        nextCursor: null,
        checkpoint: head,
        completeThroughCheckpoint: true,
      }), { status: 200 });
    }) as typeof fetch;

    const first = await readStatementSet(scoped, [targetA]);
    assert.equal(first.status, 'complete');
    assert.equal(first.targets[0]?.totalSupporters, 0);
    head = '20';
    const second = await readStatementSet(scoped, [targetA]);
    assert.equal(second.status, 'complete');
    assert.equal(second.asOfBlock, '20');
    assert.equal(second.targets[0]?.totalSupporters, 0);
    assert.ok(gte.includes('start'));
    assert.ok(gte.includes('13'));
    assert.equal(gte.filter(value => value === 'start').length, 3);
  });

  it('discards scans when the indexer build id changes', async () => {
    const store = new MemoryFoldStore();
    const scoped = { ...machinery, foldStore: store } as unknown as SDKMachinery;
    let upstreamId = 'build-a';
    const gte: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/sync')) {
        return new Response(JSON.stringify({
          ready: true,
          upstreamId,
          chains: [{
            chainId: '84532',
            chainName: 'base-sepolia',
            indexedThrough: '12',
            finalizedThrough: '12',
            indexedCheckpoint: '12',
            finalizedCheckpoint: '12',
          }],
        }), { status: 200 });
      }
      gte.push(url.searchParams.get('blockNumber_gte') ?? 'start');
      return new Response(JSON.stringify({
        items: [],
        truncated: false,
        nextCursor: null,
        checkpoint: '12',
        completeThroughCheckpoint: true,
      }), { status: 200 });
    }) as typeof fetch;

    await readStatementSet(scoped, [targetA]);
    upstreamId = 'build-b';
    await readStatementSet(scoped, [targetA]);
    assert.equal(gte.filter(value => value === 'start').length, 6);
  });

  it('discards a scan when the finalized head moves backwards', async () => {
    const store = new MemoryFoldStore();
    const scoped = { ...machinery, foldStore: store } as unknown as SDKMachinery;
    let head = '12';
    const gte: Array<string | null> = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/sync')) {
        return new Response(JSON.stringify({
          ready: true,
          chains: [{
            chainId: '84532',
            chainName: 'base-sepolia',
            indexedThrough: head,
            finalizedThrough: head,
            indexedCheckpoint: `cp-${head}`,
            finalizedCheckpoint: `cp-${head}`,
          }],
        }), { status: 200 });
      }
      gte.push(url.searchParams.get('blockNumber_gte'));
      return new Response(JSON.stringify({
        items: [],
        truncated: false,
        nextCursor: null,
        checkpoint: `cp-${head}`,
        completeThroughCheckpoint: true,
      }), { status: 200 });
    }) as typeof fetch;

    await readStatementSet(scoped, [targetA]);
    head = '9';
    await readStatementSet(scoped, [targetA]);
    assert.equal(gte.at(-1), null);
  });

  it('returns the previous complete scan when a refresh fails', async () => {
    const store = new MemoryFoldStore();
    const scoped = { ...machinery, foldStore: store } as unknown as SDKMachinery;
    let failEvents = false;
    let head = '12';
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/sync')) {
        return new Response(JSON.stringify({
          ready: true,
          chains: [{
            chainId: '84532',
            chainName: 'base-sepolia',
            indexedThrough: head,
            finalizedThrough: head,
            indexedCheckpoint: head,
            finalizedCheckpoint: head,
          }],
        }), { status: 200 });
      }
      if (failEvents) return new Response('nope', { status: 500 });
      return new Response(JSON.stringify({
        items: [],
        truncated: false,
        nextCursor: null,
        checkpoint: '12',
        completeThroughCheckpoint: true,
      }), { status: 200 });
    }) as typeof fetch;

    const first = await readStatementSet(scoped, [targetA]);
    assert.equal(first.status, 'complete');
    failEvents = true;
    head = '13';
    const second = await readStatementSet(scoped, [targetA]);
    assert.equal(second.status, 'stale');
    assert.equal(second.asOfBlock, '12');
    assert.equal(second.targets[0]?.totalSupporters, 0);
    assert.match(second.error ?? '', /500|nope|Event/);
  });

  it('keeps the previous snapshot when belief paging fails after implications succeed', async () => {
    const store = new MemoryFoldStore();
    const scoped = { ...machinery, foldStore: store } as unknown as SDKMachinery;
    let head = '12';
    let failBeliefs = false;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/sync')) {
        return new Response(JSON.stringify({
          ready: true,
          chains: [{
            chainId: '84532',
            chainName: 'base-sepolia',
            indexedThrough: head,
            finalizedThrough: head,
            indexedCheckpoint: head,
            finalizedCheckpoint: head,
          }],
        }), { status: 200 });
      }
      if (failBeliefs && url.searchParams.get('eventName') === 'DirectSupport') {
        return new Response('beliefs down', { status: 500 });
      }
      return new Response(JSON.stringify({
        items: [],
        truncated: false,
        nextCursor: null,
        checkpoint: head,
        completeThroughCheckpoint: true,
      }), { status: 200 });
    }) as typeof fetch;

    const first = await readStatementSet(scoped, [targetA]);
    assert.equal(first.status, 'complete');
    failBeliefs = true;
    head = '13';
    const failed = await readStatementSet(scoped, [targetA]);
    assert.equal(failed.status, 'stale');
    assert.equal(failed.asOfBlock, '12');

    failBeliefs = false;
    const recovered = await readStatementSet(scoped, [targetA]);
    assert.equal(recovered.status, 'complete');
    assert.equal(recovered.asOfBlock, '13');
  });

  it('follows a follower cursor until the frozen checkpoint is complete', async () => {
    const store = new MemoryFoldStore();
    const scoped = { ...machinery, foldStore: store } as unknown as SDKMachinery;
    const pages = new Map<string, number>();
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/sync')) {
        return new Response(JSON.stringify({
          ready: true,
          chains: [{
            chainId: '84532',
            chainName: 'base-sepolia',
            indexedThrough: '12',
            finalizedThrough: '12',
            indexedCheckpoint: 'finalized-head',
            finalizedCheckpoint: 'finalized-head',
          }],
        }), { status: 200 });
      }
      const eventName = url.searchParams.get('eventName') ?? '';
      const seen = pages.get(eventName) ?? 0;
      pages.set(eventName, seen + 1);
      if (eventName === 'DirectSupport' && seen === 0) {
        return new Response(JSON.stringify({
          items: [],
          truncated: true,
          nextCursor: 'page-2',
          checkpoint: 'finalized-head',
          completeThroughCheckpoint: false,
        }), { status: 200 });
      }
      assert.equal(url.searchParams.get('after') ?? '', eventName === 'DirectSupport' ? 'page-2' : '');
      return new Response(JSON.stringify({
        items: [],
        truncated: false,
        nextCursor: null,
        checkpoint: 'finalized-head',
        completeThroughCheckpoint: true,
      }), { status: 200 });
    }) as typeof fetch;

    const read = await readStatementSet(scoped, [targetA]);
    assert.equal(read.status, 'complete');
    assert.equal(pages.get('DirectSupport'), 2);
  });
});
