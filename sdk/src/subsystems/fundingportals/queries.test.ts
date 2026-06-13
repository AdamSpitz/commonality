import assert from 'assert';
import { getSubjectStatements, getSubjectSuccessStatements } from './queries.js';
import type { SDKMachinery } from '../../machinery.js';

const ALIGNMENT_CONTRACT = '0x9999999999999999999999999999999999999999' as const;
const PROJECT_ADDRESS = '0x1111111111111111111111111111111111111111' as const;

function makeMachinery(): SDKMachinery {
  return {
    indexerUrl: 'http://indexer.example/graphql',
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
    assert.strictEqual(url.searchParams.get('contractAddress'), ALIGNMENT_CONTRACT);
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
    assert.strictEqual(url.searchParams.get('contractAddress'), ALIGNMENT_CONTRACT);
    assert.strictEqual(url.searchParams.get('eventName'), 'SuccessAttestation');
    assert.strictEqual(
      url.searchParams.get('topic2'),
      `0x000000000000000000000000${PROJECT_ADDRESS.slice(2)}`,
    );
  });
});
