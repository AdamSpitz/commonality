import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'mocha';
import { encodeAbiParameters, encodeEventTopics, parseAbiParameters, type Address } from 'viem';
import type { SDKMachinery } from '../../../machinery.js';
import { BeliefsAbi, ImplicationsAbi } from '../../../abis/conceptspace.js';
import { bytes32ToCid, cidToBytes32, type IpfsCidV1 } from '../../../utils/cid-types.js';
import type { RawEventFromCache } from '../../../utils/eventCacheClient.js';
import { MemoryFoldStore } from '../../../utils/resumableFold.js';
import { createStatement, toCanonicalJson } from '../../displayable-documents/displayable-document.js';
import { computePublishedDataId } from '../../published-data/id.js';
import { fakeContentResolver } from '../../published-data/test-support.js';
import { readStatementSet, statementSetSupportFromEvents } from './statement-set.js';
import type { DecodedDirectSupportEvent, DecodedImplicationAttestationEvent } from '../../../utils/event-decoders/conceptspace.js';

const targetA = 'bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as IpfsCidV1;
const targetB = 'bafybeibbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as IpfsCidV1;
const source = 'bafybeicccccccccccccccccccccccccccccccccccccccccccccccccccc' as IpfsCidV1;
const user = (n: number) => `0x${n.toString(16).padStart(40, '0')}` as const;

// Event decoders rehydrate bytes32 statement ids as dag-pb CIDv1. These are that
// form of bafkreifzjut3te2nhyekklss27nh3k7232xplrvgnbo3wxj335rkr3v36m and
// bafkreib6z3wp7uj3d7ct6e3efwvl7yuxtzvqhvzq2g3m5v45x7zqsc2xmi.
const namedTarget = 'bafybeifzjut3te2nhyekklss27nh3k7232xplrvgnbo3wxj335rkr3v36m' as IpfsCidV1;
const namedSource = 'bafybeib6z3wp7uj3d7ct6e3efwvl7yuxtzvqhvzq2g3m5v45x7zqsc2xmi' as IpfsCidV1;
const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000' as const;
const BELIEFS = '0x00000000000000000000000000000000000000b1';
const IMPLICATIONS = '0x00000000000000000000000000000000000000c1';

function topicAt(topics: readonly unknown[], index: number): string | null {
  const topic = topics[index];
  return typeof topic === 'string' ? topic : null;
}

function directSupportRawEvent(
  address: Address,
  statementCid: string,
  beliefState: number,
  logIndex = 0,
): RawEventFromCache {
  const topics = encodeEventTopics({
    abi: BeliefsAbi,
    eventName: 'DirectSupport',
    args: { user: address, statementId: cidToBytes32(statementCid) },
  });
  return {
    id: `${address}-${statementCid}-${logIndex}`,
    contractAddress: BELIEFS,
    eventName: 'DirectSupport',
    blockNumber: '10',
    blockTimestamp: '1700000000',
    transactionHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    logIndex,
    topic0: topicAt(topics, 0),
    topic1: topicAt(topics, 1),
    topic2: topicAt(topics, 2),
    topic3: null,
    data: encodeAbiParameters(parseAbiParameters('uint8'), [beliefState]),
  };
}

function implicationRawEvent(fromCid: string, toCid: string, attester: Address, logIndex = 0): RawEventFromCache {
  const topics = encodeEventTopics({
    abi: ImplicationsAbi,
    eventName: 'ImplicationAttestation',
    args: {
      attester,
      fromStatementCid: cidToBytes32(fromCid),
      toStatementCid: cidToBytes32(toCid),
    },
  });
  return {
    id: `${fromCid}-${toCid}-${logIndex}`,
    contractAddress: IMPLICATIONS,
    eventName: 'ImplicationAttestation',
    blockNumber: '10',
    blockTimestamp: '1700000000',
    transactionHash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    logIndex,
    topic0: topicAt(topics, 0),
    topic1: topicAt(topics, 1),
    topic2: topicAt(topics, 2),
    topic3: topicAt(topics, 3),
    data: encodeAbiParameters(parseAbiParameters('bytes32'), [ZERO_BYTES32]),
  };
}

function syncBody(head: string) {
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

function eventPage(items: RawEventFromCache[], checkpoint: string) {
  return new Response(JSON.stringify({
    items,
    truncated: false,
    nextCursor: null,
    checkpoint,
    completeThroughCheckpoint: true,
  }), { status: 200 });
}

function cidForIndex(index: number): IpfsCidV1 {
  return bytes32ToCid(`0x${(index + 1).toString(16).padStart(64, '0')}`);
}

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

  it('drops indirect support from a retracted source that is also a target', async () => {
    const document = createStatement({ content: 'Retracted source that is also a target' });
    const bytes = new TextEncoder().encode(toCanonicalJson(document));
    const dataId = computePublishedDataId(bytes);
    const sourceTarget = bytes32ToCid(dataId);
    const store = new MemoryFoldStore();
    const scoped = {
      ...machinery,
      foldStore: store,
      publishedContentResolver: fakeContentResolver([bytes]),
    } as unknown as SDKMachinery;
    let head = '12';
    let failEvents = false;
    const seen: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      seen.push(url.pathname);
      if (url.pathname.endsWith('/sync')) return syncBody(head);
      if (url.pathname.toLowerCase().includes('/api/published-data/')) {
        assert.equal(url.pathname.toLowerCase(), `/api/published-data/${dataId.toLowerCase()}`);
        // The reader needs a publication pointer before it will accept retracted bytes.
        return new Response(JSON.stringify({
          status: 'retracted',
          publications: [{
            publisher: user(1),
            transactionHash: `0x${'ab'.repeat(32)}`,
            blockNumber: '1',
            logIndex: 0,
          }],
        }), { status: 200 });
      }
      if (failEvents) return new Response('events down', { status: 500 });
      const eventName = url.searchParams.get('eventName');
      if (eventName === 'ImplicationAttestation') {
        return eventPage([implicationRawEvent(sourceTarget, namedTarget, user(9))], head);
      }
      if (eventName === 'DirectSupport') {
        return eventPage([
          directSupportRawEvent(user(1), sourceTarget, 1, 0),
          directSupportRawEvent(user(2), namedTarget, 1, 1),
        ], head);
      }
      return eventPage([], head);
    }) as typeof fetch;

    const read = await readStatementSet(scoped, [sourceTarget, namedTarget]);
    assert.equal(read.status, 'complete');
    assert.ok(seen.some(path => path.toLowerCase().includes('/api/published-data/')));
    assert.deepEqual(read.targets, [
      { statementCid: sourceTarget, directSigners: 1, indirectOnlySupporters: 0, totalSupporters: 1 },
      { statementCid: namedTarget, directSigners: 1, indirectOnlySupporters: 0, totalSupporters: 1 },
    ]);
    assert.deepEqual(read.sourceStatements, []);

    failEvents = true;
    head = '13';
    const stale = await readStatementSet(scoped, [sourceTarget, namedTarget]);
    assert.equal(stale.status, 'stale');
    assert.equal(stale.asOfBlock, '12');
    assert.equal(stale.targets[0]?.directSigners, 1);
    assert.equal(stale.targets[1]?.directSigners, 1);
    assert.equal(stale.targets[1]?.indirectOnlySupporters, 0);
    assert.deepEqual(stale.sourceStatements, []);
  });

  it('fetches a shared external source once in the same direct-support group as the targets', async () => {
    const otherTarget = cidForIndex(7);
    const store = new MemoryFoldStore();
    const scoped = { ...machinery, foldStore: store, ipfsConfig: {} } as unknown as SDKMachinery;
    const directTopics: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/sync')) return syncBody('12');
      if (url.pathname.toLowerCase().includes('/api/published-data/')) {
        return new Response(JSON.stringify({ status: 'not-published' }), { status: 200 });
      }
      const eventName = url.searchParams.get('eventName');
      if (eventName === 'DirectSupport') directTopics.push(url.searchParams.get('topic2_in') ?? '');
      if (eventName === 'ImplicationAttestation') {
        return eventPage([
          implicationRawEvent(namedSource, namedTarget, user(9), 0),
          implicationRawEvent(namedSource, otherTarget, user(9), 1),
          implicationRawEvent(namedTarget, otherTarget, user(9), 2),
        ], '12');
      }
      return eventPage([], '12');
    }) as typeof fetch;

    const read = await readStatementSet(scoped, [namedTarget, otherTarget]);
    assert.equal(read.status, 'complete', read.error);
    assert.deepEqual(directTopics, [[
      cidToBytes32(namedTarget),
      cidToBytes32(otherTarget),
      cidToBytes32(namedSource),
    ].join(',')]);
    assert.equal(directTopics[0]?.split(',').filter(topic => topic === cidToBytes32(namedSource)).length, 1);
    assert.deepEqual([...read.sourceStatements].sort(), [namedSource, namedTarget].sort());
  });

  it('chunks a 100-target read and warms from the scanned block', async () => {
    const store = new MemoryFoldStore();
    const scoped = { ...machinery, foldStore: store } as unknown as SDKMachinery;
    const targets = Array.from({ length: 100 }, (_, index) => cidForIndex(index));
    let head = '12';
    const cold: Array<{ eventName: string; gte: string | null; topics: number }> = [];
    const warm: Array<{ eventName: string; gte: string | null; topics: number }> = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/sync')) return syncBody(head);
      const topicIn = url.searchParams.get('topic2_in') ?? url.searchParams.get('topic3_in') ?? '';
      const hit = {
        eventName: url.searchParams.get('eventName') ?? '',
        gte: url.searchParams.get('blockNumber_gte'),
        topics: topicIn === '' ? 0 : topicIn.split(',').length,
      };
      (head === '12' ? cold : warm).push(hit);
      return eventPage([], head);
    }) as typeof fetch;

    const first = await readStatementSet(scoped, targets);
    assert.equal(first.status, 'complete');
    head = '20';
    const second = await readStatementSet(scoped, targets);
    assert.equal(second.status, 'complete');
    assert.equal(second.asOfBlock, '20');

    const counts = (hits: typeof cold, eventName: string) => hits.filter(hit => hit.eventName === eventName);
    for (const eventName of ['ImplicationAttestation', 'ImplicationRevoked', 'DirectSupport']) {
      const firstChunks = counts(cold, eventName);
      const secondChunks = counts(warm, eventName);
      assert.equal(firstChunks.length, 4, eventName);
      assert.deepEqual(firstChunks.map(hit => hit.topics), [32, 32, 32, 4], eventName);
      assert.ok(firstChunks.every(hit => hit.gte == null), eventName);
      assert.equal(secondChunks.length, 4, eventName);
      assert.ok(secondChunks.every(hit => hit.gte === '13'), eventName);
    }
    assert.equal(warm.filter(hit => hit.gte == null).length, 0);
  });
});
