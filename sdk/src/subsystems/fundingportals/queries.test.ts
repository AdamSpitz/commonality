import assert from 'assert';
import { calculateSuccessConfidenceScore, getSubjectStatements, getSubjectSuccessStatements, noteIntentNoteLookupKey } from './queries.js';
const A = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const B = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
const C = '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC';
import type { SDKMachinery } from '../../machinery.js';

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
      marketplaceFactory: '0x0000000000000000000000000000000000000005',
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
    let requestedUrl = '';
    global.fetch = (async (input: RequestInfo | URL) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    await getSubjectStatements(makeMachinery(), PROJECT_ADDRESS);

    const url = new URL(requestedUrl);
    assert.strictEqual(url.searchParams.get('contractAddress'), null);
    assert.strictEqual(url.searchParams.get('eventName'), 'AlignmentAttestation');
    assert.strictEqual(
      url.searchParams.get('topic2'),
      `0x000000000000000000000000${PROJECT_ADDRESS.slice(2)}`,
    );
  });

  it('pads address subjects before querying success attestations by subjectId topic', async () => {
    let requestedUrl = '';
    global.fetch = (async (input: RequestInfo | URL) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    await getSubjectSuccessStatements(makeMachinery(), PROJECT_ADDRESS);

    const url = new URL(requestedUrl);
    assert.strictEqual(url.searchParams.get('contractAddress'), null);
    assert.strictEqual(url.searchParams.get('eventName'), 'SuccessAttestation');
    assert.strictEqual(
      url.searchParams.get('topic2'),
      `0x000000000000000000000000${PROJECT_ADDRESS.slice(2)}`,
    );
  });
});
