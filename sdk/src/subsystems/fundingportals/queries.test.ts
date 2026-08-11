import assert from 'assert';
import { encodeAbiParameters, encodeEventTopics } from 'viem';
import {
  calculateSuccessConfidenceScore,
  classifyAlignedProjectStatus,
  getAlignmentAttestation,
  getSubjectStatements,
  getSubjectSuccessStatements,
  noteIntentNoteLookupKey,
  remainingToThresholdForProject,
} from './queries.js';
import { PROJECT_ALIGNMENT_TOPIC } from './constants.js';
const A = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const B = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
const C = '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC';
import type { SDKMachinery } from '../../machinery.js';
import { AlignmentAttestationsAbi } from '../../abis.js';
import { cidToBytes32 } from '../../utils/cid-types.js';
import { fakeIpfsCidV1 } from '../../utils/test-helpers.js';

const ALIGNMENT_CONTRACT = '0x9999999999999999999999999999999999999999' as const;
const PROJECT_ADDRESS = '0x1111111111111111111111111111111111111111' as const;

function makeMachinery(): SDKMachinery {
  return {
    ipfsConfig: {},
    twitterApiConfig: {},
    testConfig: {},
    eventCacheUrl: 'http://event-cache.example',
    contractAddresses: {
      beliefs: '0x0000000000000000000000000000000000000001',
      implications: '0x0000000000000000000000000000000000000002',
      assuranceContractFactory: '0x0000000000000000000000000000000000000003',
      erc1155Factory: '0x0000000000000000000000000000000000000004',
      delegatableNotes: '0x0000000000000000000000000000000000000006',
      noteIntent: '0x0000000000000000000000000000000000000007',
      alignmentAttestations: ALIGNMENT_CONTRACT,
      mutableRefUpdater: '0x0000000000000000000000000000000000000008',
      trustRegistry: '0x0000000000000000000000000000000000000009',
    },
  };
}

describe('funding portal queries', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('aligned project open/succeeded classification', () => {
    const now = 1_700_000_000;

    it('classifies threshold-met projects as succeeded even after deadline', () => {
      assert.strictEqual(
        classifyAlignedProjectStatus({
          totalReceived: '100',
          threshold: '100',
          deadline: String(now - 10),
        }, now),
        'succeeded',
      );
    });

    it('classifies under-threshold past-deadline projects as refunding', () => {
      assert.strictEqual(
        classifyAlignedProjectStatus({
          totalReceived: '50',
          threshold: '100',
          deadline: String(now - 1),
        }, now),
        'refunding',
      );
    });

    it('classifies under-threshold before-deadline projects as active', () => {
      assert.strictEqual(
        classifyAlignedProjectStatus({
          totalReceived: '50',
          threshold: '100',
          deadline: String(now + 100),
        }, now),
        'active',
      );
    });

    it('reports remaining-to-threshold only for open projects', () => {
      assert.strictEqual(
        remainingToThresholdForProject({
          totalReceived: '40',
          threshold: '100',
          deadline: String(now + 100),
        }, now),
        60n,
      );
      assert.strictEqual(
        remainingToThresholdForProject({
          totalReceived: '100',
          threshold: '100',
          deadline: String(now + 100),
        }, now),
        0n,
      );
      assert.strictEqual(
        remainingToThresholdForProject({
          totalReceived: '40',
          threshold: '100',
          deadline: String(now - 1),
        }, now),
        0n,
      );
    });
  });

  it('scopes note-intent note lookups by DelegatableNotes contract address', () => {
    assert.strictEqual(
      noteIntentNoteLookupKey({ noteContract: '0xABCDEFabcdefABCDEFabcdefABCDEFabcdefabcd', noteId: '1' }),
      '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd:1',
    );
  });

  it('scores direct success vouches higher than implication-derived vouches', () => {
    assert.strictEqual(
      calculateSuccessConfidenceScore({
        directAttesters: ['0xaaa', '0xbbb', '0xaaa'],
        indirectAttesters: ['0xccc', '0xccc'],
      }).toString(),
      '5',
    );
  });

  it('ignores trust weights when none are supplied (count-based fallback is unchanged)', () => {
    assert.strictEqual(
      calculateSuccessConfidenceScore({ directAttesters: [A, B], indirectAttesters: [C] }).toString(),
      '5',
    );
  });

  it('weights success vouches by the viewer transitive trust score, direct > indirect', () => {
    // Two direct attesters (full trust 100 + half trust 50) + one indirect (full trust 100):
    // direct = 2*1.0 + 2*0.5 = 3; indirect = 1*1.0 = 1 -> round(4) = 4.
    const weights = new Map([[A.toLowerCase(), 100], [B.toLowerCase(), 50], [C.toLowerCase(), 100]]);
    assert.strictEqual(
      calculateSuccessConfidenceScore({ directAttesters: [A, B], indirectAttesters: [C] }, weights).toString(),
      '4',
    );
  });

  it('drops vouches from attesters outside the trust network (weight 0) when weights are supplied', () => {
    // Only A is trusted (100, direct). B is present but untrusted (no map entry).
    const weights = new Map([[A.toLowerCase(), 100]]);
    assert.strictEqual(
      calculateSuccessConfidenceScore({ directAttesters: [A, B], indirectAttesters: [] }, weights).toString(),
      '2',
    );
  });

  it('matches the count-based score when every attester is fully trusted', () => {
    const weights = new Map([[A.toLowerCase(), 100], [B.toLowerCase(), 100], [C.toLowerCase(), 100]]);
    assert.strictEqual(
      calculateSuccessConfidenceScore({ directAttesters: [A, B], indirectAttesters: [C] }, weights).toString(),
      '5',
    );
  });

  it('pads address subjects before querying indexed subjectId topics', async () => {
    const requestedUrls: string[] = [];
    global.fetch = (async (input: RequestInfo | URL) => {
      requestedUrls.push(String(input));
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    await getSubjectStatements(makeMachinery(), PROJECT_ADDRESS);

    assert.deepStrictEqual(
      requestedUrls.map((requestedUrl) => new URL(requestedUrl).searchParams.get('eventName')).sort(),
      ['AlignmentAttestation', 'AlignmentRevoked'],
    );
    for (const requestedUrl of requestedUrls) {
      const url = new URL(requestedUrl);
      assert.strictEqual(url.searchParams.get('contractAddress'), null);
      assert.strictEqual(
        url.searchParams.get('topic2'),
        `0x000000000000000000000000${PROJECT_ADDRESS.slice(2)}`,
      );
    }
  });

  it('matches topic CIDs by digest when the on-chain decoder cannot preserve the CID codec', async () => {
    global.fetch = (async () => new Response(JSON.stringify({
      items: [{
        id: 'alignment-1',
        chainId: 31337,
        contractAddress: ALIGNMENT_CONTRACT,
        eventName: 'AlignmentAttestation',
        blockNumber: '1',
        blockTimestamp: '2',
        transactionHash: `0x${'1'.repeat(64)}`,
        logIndex: 0,
        topic0: '0xf4e10b3d2db0859dd71e0ac116e343f76c2cf879bfa778159f3e1a00b5e51b9c',
        topic1: `0x${'0'.repeat(24)}${A.slice(2).toLowerCase()}`,
        topic2: `0x${'0'.repeat(24)}${PROJECT_ADDRESS.slice(2)}`,
        topic3: `0x${'3'.repeat(64)}`,
        // PROJECT_ALIGNMENT_TOPIC is a raw-codec bafkrei… CID. Decoding the
        // bytes32 digest produces a dag-pb bafybei… CID with the same digest.
        data: '0x6035f99179e73cd2d378bb9272b40a0cd4a50e103eb49486a674aaa7aff4ac7e',
      }],
    }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch;

    const statements = await getSubjectStatements(
      makeMachinery(),
      PROJECT_ADDRESS,
      undefined,
      PROJECT_ALIGNMENT_TOPIC,
    );

    assert.strictEqual(statements.length, 1);
  });

  it('filters a specific alignment by its requested topic', async () => {
    const statementCid = fakeIpfsCidV1('alignment-statement');
    const storedTopicCid = fakeIpfsCidV1('stored-topic');
    const requestedTopicCid = fakeIpfsCidV1('different-topic');
    global.fetch = (async (input: RequestInfo | URL) => {
      const eventName = new URL(String(input)).searchParams.get('eventName');
      const items = eventName === 'AlignmentAttestation' ? [{
        id: 'alignment-topic-filter',
        chainId: 31337,
        contractAddress: ALIGNMENT_CONTRACT,
        eventName: 'AlignmentAttestation',
        blockNumber: '1',
        blockTimestamp: '2',
        transactionHash: `0x${'1'.repeat(64)}`,
        logIndex: 0,
        topic0: '0xf4e10b3d2db0859dd71e0ac116e343f76c2cf879bfa778159f3e1a00b5e51b9c',
        topic1: `0x${'0'.repeat(24)}${A.slice(2).toLowerCase()}`,
        topic2: `0x${'0'.repeat(24)}${PROJECT_ADDRESS.slice(2)}`,
        topic3: cidToBytes32(statementCid),
        data: cidToBytes32(storedTopicCid),
      }] : [];
      return new Response(JSON.stringify({ items }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    const alignment = await getAlignmentAttestation(
      makeMachinery(),
      A,
      PROJECT_ADDRESS,
      statementCid,
      requestedTopicCid,
    );

    assert.strictEqual(alignment, null);
  });

  it('removes a success attestation after a matching SuccessRevoked event', async () => {
    const statementCid = fakeIpfsCidV1('success-statement');
    const topicCid = fakeIpfsCidV1('success-topic');
    const subjectId = `0x${'0'.repeat(24)}${PROJECT_ADDRESS.slice(2)}` as `0x${string}`;
    const makeEvent = (eventName: 'SuccessAttestation' | 'SuccessRevoked', blockNumber: number) => {
      const topics = encodeEventTopics({
        abi: AlignmentAttestationsAbi,
        eventName,
        args: {
          attester: A.toLowerCase() as `0x${string}`,
          subjectId,
          statementId: cidToBytes32(statementCid),
        },
      }) as readonly `0x${string}`[];
      return {
        id: `${eventName}-${blockNumber}`,
        chainId: 31337,
        contractAddress: ALIGNMENT_CONTRACT,
        eventName,
        blockNumber: String(blockNumber),
        blockTimestamp: String(blockNumber),
        transactionHash: `0x${String(blockNumber).padStart(64, '0')}`,
        logIndex: 0,
        topic0: topics[0] ?? null,
        topic1: topics[1] ?? null,
        topic2: topics[2] ?? null,
        topic3: topics[3] ?? null,
        data: encodeAbiParameters([{ type: 'bytes32' }], [cidToBytes32(topicCid)]),
      };
    };
    global.fetch = (async (input: RequestInfo | URL) => {
      const eventName = new URL(String(input)).searchParams.get('eventName');
      const items = eventName === 'SuccessAttestation'
        ? [makeEvent('SuccessAttestation', 1)]
        : [makeEvent('SuccessRevoked', 2)];
      return new Response(JSON.stringify({ items }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    const successes = await getSubjectSuccessStatements(makeMachinery(), PROJECT_ADDRESS);
    assert.deepStrictEqual(successes, []);
  });

  it('pads address subjects and fetches the complete success lifecycle', async () => {
    const requestedUrls: string[] = [];
    global.fetch = (async (input: RequestInfo | URL) => {
      requestedUrls.push(String(input));
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    await getSubjectSuccessStatements(makeMachinery(), PROJECT_ADDRESS);

    assert.deepStrictEqual(
      requestedUrls.map((requestedUrl) => new URL(requestedUrl).searchParams.get('eventName')).sort(),
      ['SuccessAttestation', 'SuccessRevoked'],
    );
    for (const requestedUrl of requestedUrls) {
      const url = new URL(requestedUrl);
      assert.strictEqual(url.searchParams.get('contractAddress'), null);
      assert.strictEqual(
        url.searchParams.get('topic2'),
        `0x000000000000000000000000${PROJECT_ADDRESS.slice(2)}`,
      );
    }
  });
});
