import assert from 'assert';
import { encodeEventTopics, encodeAbiParameters, parseAbiParameters, type Address } from 'viem';
import { createSDKMachinery } from '../../machinery.js';
import { uploadToMockIPFS } from '../../utils/mock-ipfs.js';
import { cidToBytes32 } from '../../utils/cid-types.js';
import { fakeIpfsCidV1 } from '../../utils/test-helpers.js';
import type { RawEventFromCache } from '../../utils/eventCacheClient.js';
import { NudgePublicationsAbi, BeliefsAbi, ImplicationsAbi } from '../../abis.js';
import { computeAnonymizedId, ProofTier, type AnonymizedId } from '../identity/unique-human-id.js';
import { getCuratedCollections, getNudgerPublications, getStatementNudges, getIndirectSupporters, getStatementSupportTieredHeadCount } from './queries.js';

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

describe('conceptspace nudger publication queries', () => {
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

    const machinery = createSDKMachinery(
      { shouldUseMock: true },
      undefined,
      undefined,
      undefined,
      'http://localhost:42069',
      {
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
      }
    );

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

    const machinery = createSDKMachinery(
      { shouldUseMock: true },
      undefined,
      undefined,
      undefined,
      'http://localhost:42069',
      {
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
      }
    );

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

    const machinery = createSDKMachinery(
      { shouldUseMock: true },
      undefined,
      undefined,
      undefined,
      'http://localhost:42069',
      {
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
      }
    );

    const collections = await getCuratedCollections(machinery, [NUDGER_B], 'fundable-project-explorer');

    assert.strictEqual(collections.length, 1);
    assert.strictEqual(collections[0]?.entries[0]?.label, 'New');
    assert.strictEqual(collections[0]?.publicationCid, newerCid);
  });
});

// ============================================================================
// getIndirectSupporters — Tally set-union dedupe (anonymized anchor ID)
// ============================================================================
//
// Verifies the anonymized-ID dedupe seam: a user who believes several
// mutually-implying statements counts once as an indirect supporter of the
// target. Today address -> anonymized_ID is 1:1 so this also validates the
// raw-address dedupe was preserved; the anonymized-ID key is the seam
// proof-of-personhood tiers will attach to (see specs/tech/shared/unique-human-id.md).

const BELIEFS_CONTRACT = '0xBELIEF0000000000000000000000000000000000'.toLowerCase() as Address;
const IMPLICATIONS_CONTRACT = '0xIMPL00000000000000000000000000000000000'.toLowerCase() as Address;
const ATTESTER = '0x4444444444444444444444444444444444444444' as Address;
const USER_1 = '0x1111111111111111111111111111111111111111' as Address;
const USER_2 = '0x2222222222222222222222222222222222222222' as Address;
const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000' as const;

function makeDirectSupportRawEvent(
  user: Address,
  statementCid: string,
  beliefState: number,
  overrides: Partial<RawEventFromCache> = {},
): RawEventFromCache {
  const topics = encodeEventTopics({
    abi: BeliefsAbi,
    eventName: 'DirectSupport',
    args: { user, statementId: cidToBytes32(statementCid) },
  });
  const data = encodeAbiParameters(
    parseAbiParameters('uint8'),
    [beliefState],
  );
  return {
    id: `${user}-${statementCid}-${overrides.logIndex ?? 0}`,
    contractAddress: BELIEFS_CONTRACT,
    eventName: 'DirectSupport',
    blockNumber: '100',
    blockTimestamp: '1700000000',
    transactionHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    logIndex: 0,
    topic0: topics[0] ?? null,
    topic1: topics[1] ?? null,
    topic2: topics[2] ?? null,
    topic3: null,
    data,
    ...overrides,
  };
}

function makeImplicationRawEvent(
  fromCid: string,
  toCid: string,
  overrides: Partial<RawEventFromCache> = {},
): RawEventFromCache {
  const topics = encodeEventTopics({
    abi: ImplicationsAbi,
    eventName: 'ImplicationAttestation',
    args: {
      attester: ATTESTER,
      fromStatementCid: cidToBytes32(fromCid),
      toStatementCid: cidToBytes32(toCid),
    },
  });
  const data = encodeAbiParameters(
    parseAbiParameters('bytes32'),
    [ZERO_BYTES32],
  );
  return {
    id: `${fromCid}-${toCid}-${overrides.logIndex ?? 0}`,
    contractAddress: IMPLICATIONS_CONTRACT,
    eventName: 'ImplicationAttestation',
    blockNumber: '100',
    blockTimestamp: '1700000000',
    transactionHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    logIndex: 0,
    topic0: topics[0] ?? null,
    topic1: topics[1] ?? null,
    topic2: topics[2] ?? null,
    topic3: topics[3] ?? null,
    data,
    ...overrides,
  };
}

describe('getIndirectSupporters — anonymized-ID set-union dedupe', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function makeMachinery() {
    return createSDKMachinery(
      { shouldUseMock: true },
      undefined,
      undefined,
      undefined,
      'http://localhost:42069',
      {
        beliefs: BELIEFS_CONTRACT,
        implications: IMPLICATIONS_CONTRACT,
        assuranceContractFactory: '0x0000000000000000000000000000000000000000',
        erc1155Factory: '0x0000000000000000000000000000000000000000',
        marketplaceFactory: '0x0000000000000000000000000000000000000000',
        delegatableNotes: '0x0000000000000000000000000000000000000000',
        noteIntent: '0x0000000000000000000000000000000000000000',
        alignmentAttestations: '0x0000000000000000000000000000000000000000',
        mutableRefUpdater: '0x0000000000000000000000000000000000000000',
        trustRegistry: '0x0000000000000000000000000000000000000000',
        nudgePublications: '0x0000000000000000000000000000000000000000',
      },
    );
  }

  it('counts a user once when they believe multiple statements that all imply the target', async () => {
    const S1 = fakeIpfsCidV1('indirect-s1');
    const S2 = fakeIpfsCidV1('indirect-s2');
    const TARGET = fakeIpfsCidV1('indirect-target');

    // User1 believes both S1 and S2; User2 believes only S1.
    const s1Events = [
      makeDirectSupportRawEvent(USER_1, S1, 1, { logIndex: 0 }),
      makeDirectSupportRawEvent(USER_2, S1, 1, { logIndex: 1 }),
    ];
    const s2Events = [
      makeDirectSupportRawEvent(USER_1, S2, 1, { logIndex: 0 }),
    ];
    const targetEvents: RawEventFromCache[] = [];
    const implicationEvents = [
      makeImplicationRawEvent(S1, TARGET, { logIndex: 0 }),
      makeImplicationRawEvent(S2, TARGET, { logIndex: 1 }),
    ];

    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = new URL(typeof input === 'string' ? input : input.url);
      const eventName = url.searchParams.get('eventName');
      const topic2 = url.searchParams.get('topic2');
      const topic3 = url.searchParams.get('topic3');

      let items: RawEventFromCache[] = [];
      if (eventName === 'ImplicationAttestation' && topic3 === cidToBytes32(TARGET)) {
        items = implicationEvents;
      } else if (eventName === 'DirectSupport' && topic2 === cidToBytes32(S1)) {
        items = s1Events;
      } else if (eventName === 'DirectSupport' && topic2 === cidToBytes32(S2)) {
        items = s2Events;
      } else if (eventName === 'DirectSupport' && topic2 === cidToBytes32(TARGET)) {
        items = targetEvents;
      }

      return new Response(JSON.stringify({ items }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    const machinery = makeMachinery();
    const supporters = await getIndirectSupporters(machinery, TARGET);

    // User1 signed two implying statements but must count once (set-union on
    // anonymized anchor ID). User2 counts once. Total = 2.
    assert.strictEqual(supporters.length, 2, 'two distinct anchors after set-union dedupe');

    const userAddresses = supporters.map(s => s.user.toLowerCase()).sort();
    assert.deepStrictEqual(userAddresses, [USER_1.toLowerCase(), USER_2.toLowerCase()]);
  });

  it('excludes a user who explicitly disbelieves the target (by anonymized ID)', async () => {
    const S1 = fakeIpfsCidV1('disbelieve-s1');
    const TARGET = fakeIpfsCidV1('disbelieve-target');

    const s1Events = [
      makeDirectSupportRawEvent(USER_1, S1, 1, { logIndex: 0 }),
      makeDirectSupportRawEvent(USER_2, S1, 1, { logIndex: 1 }),
    ];
    // User1 explicitly disbelieves the target.
    const targetEvents = [
      makeDirectSupportRawEvent(USER_1, TARGET, 2, { logIndex: 0 }),
    ];
    const implicationEvents = [
      makeImplicationRawEvent(S1, TARGET, { logIndex: 0 }),
    ];

    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = new URL(typeof input === 'string' ? input : input.url);
      const eventName = url.searchParams.get('eventName');
      const topic2 = url.searchParams.get('topic2');
      const topic3 = url.searchParams.get('topic3');

      let items: RawEventFromCache[] = [];
      if (eventName === 'ImplicationAttestation' && topic3 === cidToBytes32(TARGET)) {
        items = implicationEvents;
      } else if (eventName === 'DirectSupport' && topic2 === cidToBytes32(S1)) {
        items = s1Events;
      } else if (eventName === 'DirectSupport' && topic2 === cidToBytes32(TARGET)) {
        items = targetEvents;
      }

      return new Response(JSON.stringify({ items }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    const machinery = makeMachinery();
    const supporters = await getIndirectSupporters(machinery, TARGET);

    // User1 is excluded (disbelieves target); only User2 remains.
    assert.strictEqual(supporters.length, 1, 'disbeliever excluded by anonymized ID');
    assert.strictEqual(supporters[0].user.toLowerCase(), USER_2.toLowerCase());
  });
});

// ============================================================================
// getStatementSupportTieredHeadCount — tiered head-count over the deduped
// supporter base (direct + indirect, deduped by anonymized anchor ID).
// ============================================================================

describe('getStatementSupportTieredHeadCount', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function makeMachinery() {
    return createSDKMachinery(
      { shouldUseMock: true },
      undefined,
      undefined,
      undefined,
      'http://localhost:42069',
      {
        beliefs: BELIEFS_CONTRACT,
        implications: IMPLICATIONS_CONTRACT,
        assuranceContractFactory: '0x0000000000000000000000000000000000000000',
        erc1155Factory: '0x0000000000000000000000000000000000000000',
        marketplaceFactory: '0x0000000000000000000000000000000000000000',
        delegatableNotes: '0x0000000000000000000000000000000000000000',
        noteIntent: '0x0000000000000000000000000000000000000000',
        alignmentAttestations: '0x0000000000000000000000000000000000000000',
        mutableRefUpdater: '0x0000000000000000000000000000000000000000',
        trustRegistry: '0x0000000000000000000000000000000000000000',
        nudgePublications: '0x0000000000000000000000000000000000000000',
      },
    );
  }

  it('unions direct believers and indirect supporters, deduped by anonymized ID, all tier 0 by default', async () => {
    const S1 = fakeIpfsCidV1('tiered-s1');
    const TARGET = fakeIpfsCidV1('tiered-target');

    // USER_1 directly believes the target AND believes S1 (which implies it);
    // must count once. USER_2 only indirectly supports via S1.
    const s1Events = [
      makeDirectSupportRawEvent(USER_1, S1, 1, { logIndex: 0 }),
      makeDirectSupportRawEvent(USER_2, S1, 1, { logIndex: 1 }),
    ];
    const targetEvents = [
      makeDirectSupportRawEvent(USER_1, TARGET, 1, { logIndex: 0 }),
    ];
    const implicationEvents = [makeImplicationRawEvent(S1, TARGET, { logIndex: 0 })];

    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = new URL(typeof input === 'string' ? input : input.url);
      const eventName = url.searchParams.get('eventName');
      const topic2 = url.searchParams.get('topic2');
      const topic3 = url.searchParams.get('topic3');
      let items: RawEventFromCache[] = [];
      if (eventName === 'ImplicationAttestation' && topic3 === cidToBytes32(TARGET)) {
        items = implicationEvents;
      } else if (eventName === 'DirectSupport' && topic2 === cidToBytes32(S1)) {
        items = s1Events;
      } else if (eventName === 'DirectSupport' && topic2 === cidToBytes32(TARGET)) {
        items = targetEvents;
      }
      return new Response(JSON.stringify({ items }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    const machinery = makeMachinery();
    const headCount = await getStatementSupportTieredHeadCount(machinery, TARGET);

    // Two distinct anchors (USER_1 deduped across direct + indirect); all tier 0.
    assert.strictEqual(headCount.total, 2);
    assert.strictEqual(headCount.assertedOrHigher, 0);
    assert.strictEqual(headCount.oneAttestationOrHigher, 0);
    assert.strictEqual(headCount.multipleAttestationsOrHigher, 0);
  });

  it('excludes a target disbeliever from the supporter base even if they believe an implying statement', async () => {
    const S1 = fakeIpfsCidV1('tiered-disbel-s1');
    const TARGET = fakeIpfsCidV1('tiered-disbel-target');

    const s1Events = [
      makeDirectSupportRawEvent(USER_1, S1, 1, { logIndex: 0 }),
      makeDirectSupportRawEvent(USER_2, S1, 1, { logIndex: 1 }),
    ];
    // USER_1 explicitly disbelieves the target.
    const targetEvents = [makeDirectSupportRawEvent(USER_1, TARGET, 2, { logIndex: 0 })];
    const implicationEvents = [makeImplicationRawEvent(S1, TARGET, { logIndex: 0 })];

    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = new URL(typeof input === 'string' ? input : input.url);
      const eventName = url.searchParams.get('eventName');
      const topic2 = url.searchParams.get('topic2');
      const topic3 = url.searchParams.get('topic3');
      let items: RawEventFromCache[] = [];
      if (eventName === 'ImplicationAttestation' && topic3 === cidToBytes32(TARGET)) {
        items = implicationEvents;
      } else if (eventName === 'DirectSupport' && topic2 === cidToBytes32(S1)) {
        items = s1Events;
      } else if (eventName === 'DirectSupport' && topic2 === cidToBytes32(TARGET)) {
        items = targetEvents;
      }
      return new Response(JSON.stringify({ items }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    const machinery = makeMachinery();
    const headCount = await getStatementSupportTieredHeadCount(machinery, TARGET);

    // Only USER_2 remains; USER_1 is excluded as a target disbeliever.
    assert.strictEqual(headCount.total, 1);
  });

  it('groups the supporter base by known proof tiers (cumulative thresholds)', async () => {
    const S1 = fakeIpfsCidV1('tiered-known-s1');
    const TARGET = fakeIpfsCidV1('tiered-known-target');

    const s1Events = [makeDirectSupportRawEvent(USER_1, S1, 1, { logIndex: 0 })];
    const targetEvents = [makeDirectSupportRawEvent(USER_2, TARGET, 1, { logIndex: 0 })];
    const implicationEvents = [makeImplicationRawEvent(S1, TARGET, { logIndex: 0 })];

    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = new URL(typeof input === 'string' ? input : input.url);
      const eventName = url.searchParams.get('eventName');
      const topic2 = url.searchParams.get('topic2');
      const topic3 = url.searchParams.get('topic3');
      let items: RawEventFromCache[] = [];
      if (eventName === 'ImplicationAttestation' && topic3 === cidToBytes32(TARGET)) {
        items = implicationEvents;
      } else if (eventName === 'DirectSupport' && topic2 === cidToBytes32(S1)) {
        items = s1Events;
      } else if (eventName === 'DirectSupport' && topic2 === cidToBytes32(TARGET)) {
        items = targetEvents;
      }
      return new Response(JSON.stringify({ items }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    // USER_1 (indirect) at tier 3; USER_2 (direct) at tier 1.
    const knownTiers = new Map<AnonymizedId, number>([
      [computeAnonymizedId(USER_1), ProofTier.MULTIPLE_ATTESTATIONS],
      [computeAnonymizedId(USER_2), ProofTier.ASSERTED],
    ]);

    const machinery = makeMachinery();
    const headCount = await getStatementSupportTieredHeadCount(machinery, TARGET, { knownTiers });

    assert.strictEqual(headCount.total, 2);
    assert.strictEqual(headCount.assertedOrHigher, 2);
    assert.strictEqual(headCount.oneAttestationOrHigher, 1);
    assert.strictEqual(headCount.multipleAttestationsOrHigher, 1);
  });

  it('returns just the direct believers when no implications exist', async () => {
    const TARGET = fakeIpfsCidV1('tiered-noimpl-target');
    const targetEvents = [
      makeDirectSupportRawEvent(USER_1, TARGET, 1, { logIndex: 0 }),
      makeDirectSupportRawEvent(USER_2, TARGET, 1, { logIndex: 1 }),
    ];

    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = new URL(typeof input === 'string' ? input : input.url);
      const eventName = url.searchParams.get('eventName');
      const topic2 = url.searchParams.get('topic2');
      let items: RawEventFromCache[] = [];
      if (eventName === 'DirectSupport' && topic2 === cidToBytes32(TARGET)) {
        items = targetEvents;
      }
      return new Response(JSON.stringify({ items }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    const machinery = makeMachinery();
    const headCount = await getStatementSupportTieredHeadCount(machinery, TARGET);

    assert.strictEqual(headCount.total, 2);
    assert.strictEqual(headCount.assertedOrHigher, 0);
  });
});
