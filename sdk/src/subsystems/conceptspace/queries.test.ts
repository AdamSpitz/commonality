import assert from 'assert';
import { bytesToHex, encodeEventTopics, encodeAbiParameters, parseAbiParameters, type Address } from 'viem';
import { createSDKMachinery } from '../../machinery.js';
import { cidToBytes32 } from '../../utils/cid-types.js';
import { createStatement, toCanonicalJson } from '../displayable-documents/displayable-document.js';
import { computePublishedDataId, publishedDataIdToCid } from '../published-data/id.js';
import { fakeIpfsCidV1 } from '../../utils/test-helpers.js';
import type { RawEventFromCache } from '../../utils/eventCacheClient.js';
import { BeliefsAbi, ImplicationsAbi } from '../../abis.js';
import { computeAnonymizedId, ProofTier, type AnonymizedId } from '../identity/unique-human-id.js';
import { browseStatementsByMostSupporters, getIndirectSupporters, getStatementSupportTieredHeadCount, getStatementWithContent } from './queries.js';

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

function topicAt(topics: readonly unknown[], index: number): string | null {
  const topic = topics[index];
  return typeof topic === 'string' ? topic : null;
}

function requestUrlString(input: string | URL | Request): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

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
    topic0: topicAt(topics, 0),
    topic1: topicAt(topics, 1),
    topic2: topicAt(topics, 2),
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
    topic0: topicAt(topics, 0),
    topic1: topicAt(topics, 1),
    topic2: topicAt(topics, 2),
    topic3: topicAt(topics, 3),
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
    return createSDKMachinery({
      ipfsConfig: { shouldUseMock: true },
      eventCacheUrl: 'http://localhost:42069',
      contractAddresses: {
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
    });
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
      const url = new URL(requestUrlString(input));
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
      const url = new URL(requestUrlString(input));
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
    return createSDKMachinery({
      ipfsConfig: { shouldUseMock: true },
      eventCacheUrl: 'http://localhost:42069',
      contractAddresses: {
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
    });
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
      const url = new URL(requestUrlString(input));
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
      const url = new URL(requestUrlString(input));
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
      const url = new URL(requestUrlString(input));
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
      const url = new URL(requestUrlString(input));
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


describe('getStatementWithContent — PublishedData fallback', () => {
  const originalFetch = globalThis.fetch;
  const PUBLISHED_DATA_CONTRACT = '0x9999999999999999999999999999999999999999' as Address;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches active PublishedData statement bytes when the CID is not in IPFS', async () => {
    const document = createStatement({ content: 'PublishedData-only statement' });
    const contentBytes = new TextEncoder().encode(toCanonicalJson(document));
    const dataId = computePublishedDataId(contentBytes);
    const cid = publishedDataIdToCid(dataId);
    const directSupportEvents = [makeDirectSupportRawEvent(USER_1, cid, 1, { logIndex: 0 })];
    const requestedUrls: string[] = [];

    globalThis.fetch = (async (input: string | URL | Request) => {
      const rawUrl = requestUrlString(input);
      requestedUrls.push(rawUrl);
      const url = new URL(rawUrl);

      if (url.pathname === '/api/events') {
        const eventName = url.searchParams.get('eventName');
        const topic2 = url.searchParams.get('topic2');
        const items = eventName === 'DirectSupport' && topic2 === cidToBytes32(cid) ? directSupportEvents : [];
        return new Response(JSON.stringify({ items }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (url.pathname.toLowerCase() === `/api/published-data/${USER_1.toLowerCase()}/${dataId}`) {
        return new Response(JSON.stringify({ status: 'active', data: bytesToHex(contentBytes) }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'unexpected url' }), { status: 404 });
    }) as typeof fetch;

    const machinery = createSDKMachinery({
      ipfsConfig: { shouldUseMock: true },
      eventCacheUrl: 'http://localhost:42069',
      contractAddresses: {
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
        publishedData: PUBLISHED_DATA_CONTRACT,
      },
    });

    const result = await getStatementWithContent(machinery, cid);

    assert.equal(result?.content?.content, 'PublishedData-only statement');
    assert.equal(result?.contentStatus, 'active');
    assert.ok(requestedUrls.some(url => url.includes('/api/published-data/')));
    assert.ok(requestedUrls.some(url => url.includes(`contractAddress=${PUBLISHED_DATA_CONTRACT}`)));
  });

  it('marks a PublishedData-only statement retracted when every honored publication is self-retracted', async () => {
    const document = createStatement({ content: 'Retracted PublishedData statement' });
    const contentBytes = new TextEncoder().encode(toCanonicalJson(document));
    const dataId = computePublishedDataId(contentBytes);
    const cid = publishedDataIdToCid(dataId);
    const directSupportEvents = [makeDirectSupportRawEvent(USER_1, cid, 1, { logIndex: 0 })];

    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = new URL(requestUrlString(input));
      if (url.pathname === '/api/events') {
        const eventName = url.searchParams.get('eventName');
        const topic2 = url.searchParams.get('topic2');
        const items = eventName === 'DirectSupport' && topic2 === cidToBytes32(cid) ? directSupportEvents : [];
        return new Response(JSON.stringify({ items }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url.pathname.toLowerCase() === `/api/published-data/${USER_1.toLowerCase()}/${dataId}`) {
        return new Response(JSON.stringify({ status: 'retracted', retractedData: bytesToHex(contentBytes) }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: 'unexpected url' }), { status: 404 });
    }) as typeof fetch;

    const result = await getStatementWithContent(createSDKMachinery({
      ipfsConfig: { shouldUseMock: true },
      eventCacheUrl: 'http://localhost:42069',
      contractAddresses: {
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
        publishedData: PUBLISHED_DATA_CONTRACT,
      },
    }), cid);

    assert.equal(result?.content, null);
    assert.equal(result?.contentStatus, 'retracted');
  });

  it('suppresses retracted PublishedData-only statements from aggregate browse lists', async () => {
    const activeDocument = createStatement({ content: 'Active PublishedData statement' });
    const activeBytes = new TextEncoder().encode(toCanonicalJson(activeDocument));
    const activeDataId = computePublishedDataId(activeBytes);
    const activeCid = publishedDataIdToCid(activeDataId);
    const retractedDocument = createStatement({ content: 'Retracted PublishedData statement' });
    const retractedBytes = new TextEncoder().encode(toCanonicalJson(retractedDocument));
    const retractedDataId = computePublishedDataId(retractedBytes);
    const retractedCid = publishedDataIdToCid(retractedDataId);
    const directSupportEvents = [
      makeDirectSupportRawEvent(USER_1, activeCid, 1, { logIndex: 0 }),
      makeDirectSupportRawEvent(USER_2, retractedCid, 1, { logIndex: 1 }),
    ];

    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = new URL(requestUrlString(input));
      if (url.pathname === '/api/events') {
        return new Response(JSON.stringify({ items: url.searchParams.get('eventName') === 'DirectSupport' ? directSupportEvents : [] }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url.pathname.toLowerCase() === `/api/published-data/${USER_1.toLowerCase()}/${activeDataId}`) {
        return new Response(JSON.stringify({ status: 'active', data: bytesToHex(activeBytes) }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url.pathname.toLowerCase() === `/api/published-data/${USER_2.toLowerCase()}/${retractedDataId}`) {
        return new Response(JSON.stringify({ status: 'retracted', retractedData: bytesToHex(retractedBytes) }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return new Response(JSON.stringify({ status: 'not-published' }), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch;

    const results = await browseStatementsByMostSupporters(createSDKMachinery({
      ipfsConfig: { shouldUseMock: true },
      eventCacheUrl: 'http://localhost:42069',
      contractAddresses: {
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
        publishedData: PUBLISHED_DATA_CONTRACT,
      },
    }), { limit: 10 });

    assert.equal(results.length, 1);
    assert.equal(results[0]?.title, 'Active PublishedData statement');
  });
});
