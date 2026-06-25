import assert from 'assert';
import { encodeEventTopics } from 'viem';
import { createSDKMachinery } from '../../machinery.js';
import { uploadToMockIPFS } from '../../utils/mock-ipfs.js';
import { cidToBytes32 } from '../../utils/cid-types.js';
import { fakeIpfsCidV1 } from '../../utils/test-helpers.js';
import type { RawEventFromCache } from '../../utils/eventCacheClient.js';
import { NudgePublicationsAbi } from '../../abis.js';
import { getCuratedCollections, getNudgerPublications, getStatementNudges } from './queries.js';

const NUDGE_PUBLICATIONS = '0x9999999999999999999999999999999999999999' as const;
const NUDGER_A = '0x1111111111111111111111111111111111111111' as const;
const NUDGER_B = '0x2222222222222222222222222222222222222222' as const;
const TX_HASH = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const TARGET = fakeIpfsCidV1('target');
const SUGGESTED_A = fakeIpfsCidV1('suggested-a');
const SUGGESTED_B = fakeIpfsCidV1('suggested-b');
const EXPLORER_ENTRY = fakeIpfsCidV1('explorer-entry');

function padAddressAsTopic(address: string): string {
  return `0x${'0'.repeat(24)}${address.toLowerCase().slice(2)}`;
}

function makeNudgesPublishedEvent(
  nudger: `0x${string}`,
  publicationCid: `b${string}`,
  overrides: Partial<RawEventFromCache> = {},
): RawEventFromCache {
  const topics = encodeEventTopics({
    abi: NudgePublicationsAbi,
    eventName: 'NudgesPublished',
    args: {
      nudger,
      batchCid: cidToBytes32(publicationCid),
    },
  });

  return {
    id: `${nudger}-${publicationCid}`,
    contractAddress: NUDGE_PUBLICATIONS,
    eventName: 'NudgesPublished',
    blockNumber: '100',
    blockTimestamp: '1700000000',
    transactionHash: TX_HASH,
    logIndex: 0,
    topic0: topics[0] ?? null,
    topic1: topics[1] ?? null,
    topic2: topics[2] ?? null,
    topic3: null,
    data: '0x',
    ...overrides,
  };
}

describe('nudger publication queries', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches and parses typed nudger publications from trusted nudgers', async () => {
    const batchCid = await uploadToMockIPFS({
      kind: 'nudge-batch',
      schemaVersion: 1,
      nudger: NUDGER_A,
      publishedAt: 10,
      nudges: [{
        targetStatementCid: TARGET,
        suggestedStatementCid: SUGGESTED_A,
        reason: 'Try this one too',
        confidence: 0.9,
      }],
      revocations: [],
    });
    const collectionCid = await uploadToMockIPFS({
      kind: 'curated-collection',
      schemaVersion: 1,
      nudger: NUDGER_B,
      publishedAt: 20,
      stream: 'fundable-project-explorer',
      entries: [{
        cid: EXPLORER_ENTRY,
        label: 'Housing',
        topicArea: 'Local policy',
      }],
    });

    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = new URL(typeof input === 'string' ? input : input.url);
      const topic1 = url.searchParams.get('topic1');
      const items =
        topic1 === padAddressAsTopic(NUDGER_A)
          ? [makeNudgesPublishedEvent(NUDGER_A, batchCid)]
          : topic1 === padAddressAsTopic(NUDGER_B)
            ? [makeNudgesPublishedEvent(NUDGER_B, collectionCid, { logIndex: 1 })]
            : [];

      return new Response(JSON.stringify({ items }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    const machinery = createSDKMachinery({
      ipfsConfig: { shouldUseMock: true },
      eventCacheUrl: 'http://localhost:42069',
      contractAddresses: {
        beliefs: '0x0000000000000000000000000000000000000000',
        implications: '0x0000000000000000000000000000000000000000',
        assuranceContractFactory: '0x0000000000000000000000000000000000000000',
        erc1155Factory: '0x0000000000000000000000000000000000000000',
        marketplaceFactory: '0x0000000000000000000000000000000000000000',
        delegatableNotes: '0x0000000000000000000000000000000000000000',
        noteIntent: '0x0000000000000000000000000000000000000000',
        alignmentAttestations: '0x0000000000000000000000000000000000000000',
        mutableRefUpdater: '0x0000000000000000000000000000000000000000',
        trustRegistry: '0x0000000000000000000000000000000000000000',
        nudgePublications: NUDGE_PUBLICATIONS,
      },
    });

    const publications = await getNudgerPublications(machinery, [NUDGER_A, NUDGER_B]);

    assert.strictEqual(publications.length, 2);
    assert.strictEqual(publications[0]?.kind, 'nudge-batch');
    assert.strictEqual(publications[1]?.kind, 'curated-collection');
  });

  it('applies nudge revocations when folding statement nudges', async () => {
    const firstBatchCid = await uploadToMockIPFS({
      kind: 'nudge-batch',
      schemaVersion: 1,
      nudger: NUDGER_A,
      publishedAt: 10,
      nudges: [{
        targetStatementCid: TARGET,
        suggestedStatementCid: SUGGESTED_A,
        reason: 'Initial suggestion',
        confidence: 0.4,
      }],
      revocations: [],
    });
    const secondBatchCid = await uploadToMockIPFS({
      kind: 'nudge-batch',
      schemaVersion: 1,
      nudger: NUDGER_A,
      publishedAt: 20,
      nudges: [{
        targetStatementCid: TARGET,
        suggestedStatementCid: SUGGESTED_B,
        reason: 'Replacement suggestion',
        confidence: 0.8,
      }],
      revocations: [{
        targetStatementCid: TARGET,
        suggestedStatementCid: SUGGESTED_A,
      }],
    });

    globalThis.fetch = (async () => new Response(JSON.stringify({
      items: [
        makeNudgesPublishedEvent(NUDGER_A, firstBatchCid),
        makeNudgesPublishedEvent(NUDGER_A, secondBatchCid, { logIndex: 1, blockTimestamp: '1700000020' }),
      ],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch;

    const machinery = createSDKMachinery({
      ipfsConfig: { shouldUseMock: true },
      eventCacheUrl: 'http://localhost:42069',
      contractAddresses: {
        beliefs: '0x0000000000000000000000000000000000000000',
        implications: '0x0000000000000000000000000000000000000000',
        assuranceContractFactory: '0x0000000000000000000000000000000000000000',
        erc1155Factory: '0x0000000000000000000000000000000000000000',
        marketplaceFactory: '0x0000000000000000000000000000000000000000',
        delegatableNotes: '0x0000000000000000000000000000000000000000',
        noteIntent: '0x0000000000000000000000000000000000000000',
        alignmentAttestations: '0x0000000000000000000000000000000000000000',
        mutableRefUpdater: '0x0000000000000000000000000000000000000000',
        trustRegistry: '0x0000000000000000000000000000000000000000',
        nudgePublications: NUDGE_PUBLICATIONS,
      },
    });

    const nudges = await getStatementNudges(machinery, TARGET, [NUDGER_A]);

    assert.deepStrictEqual(
      nudges.map(({ suggestedStatementCid, reason }) => ({ suggestedStatementCid, reason })),
      [{ suggestedStatementCid: SUGGESTED_B, reason: 'Replacement suggestion' }],
    );
  });

  it('keeps the latest curated collection per nudger and stream', async () => {
    const olderCid = await uploadToMockIPFS({
      kind: 'curated-collection',
      schemaVersion: 1,
      nudger: NUDGER_B,
      publishedAt: 10,
      stream: 'fundable-project-explorer',
      entries: [{
        cid: fakeIpfsCidV1('older-entry'),
        label: 'Old',
        topicArea: 'Old topic',
      }],
    });
    const newerCid = await uploadToMockIPFS({
      kind: 'curated-collection',
      schemaVersion: 1,
      nudger: NUDGER_B,
      publishedAt: 30,
      stream: 'fundable-project-explorer',
      entries: [{
        cid: EXPLORER_ENTRY,
        label: 'New',
        topicArea: 'Better topic',
      }],
    });

    globalThis.fetch = (async () => new Response(JSON.stringify({
      items: [
        makeNudgesPublishedEvent(NUDGER_B, olderCid),
        makeNudgesPublishedEvent(NUDGER_B, newerCid, { logIndex: 1, blockTimestamp: '1700000030' }),
      ],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch;

    const machinery = createSDKMachinery({
      ipfsConfig: { shouldUseMock: true },
      eventCacheUrl: 'http://localhost:42069',
      contractAddresses: {
        beliefs: '0x0000000000000000000000000000000000000000',
        implications: '0x0000000000000000000000000000000000000000',
        assuranceContractFactory: '0x0000000000000000000000000000000000000000',
        erc1155Factory: '0x0000000000000000000000000000000000000000',
        marketplaceFactory: '0x0000000000000000000000000000000000000000',
        delegatableNotes: '0x0000000000000000000000000000000000000000',
        noteIntent: '0x0000000000000000000000000000000000000000',
        alignmentAttestations: '0x0000000000000000000000000000000000000000',
        mutableRefUpdater: '0x0000000000000000000000000000000000000000',
        trustRegistry: '0x0000000000000000000000000000000000000000',
        nudgePublications: NUDGE_PUBLICATIONS,
      },
    });

    const collections = await getCuratedCollections(machinery, [NUDGER_B], 'fundable-project-explorer');

    assert.strictEqual(collections.length, 1);
    assert.strictEqual(collections[0]?.entries[0]?.label, 'New');
    assert.strictEqual(collections[0]?.publicationCid, newerCid);
  });
});
