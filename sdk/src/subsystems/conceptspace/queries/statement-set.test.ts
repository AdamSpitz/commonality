import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'mocha';
import type { SDKMachinery } from '../../../machinery.js';
import type { IpfsCidV1 } from '../../../utils/cid-types.js';
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
});
