import assert from 'assert';
import { encodeAbiParameters, encodeEventTopics } from 'viem';
import { ProjectFactoryAbi } from '../../abis.js';
import { createSDKMachinery } from '../../machinery.js';
import type { RawEventFromCache } from '../../utils/eventCacheClient.js';
import { padAddressAsTopic } from '../../utils/eventCacheClient.js';
import { getUserCreatedProjects } from './queries.js';

const FACTORY = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const CREATOR = '0x1111111111111111111111111111111111111111' as const;
const OTHER = '0x2222222222222222222222222222222222222222' as const;
const TOKEN = '0x3333333333333333333333333333333333333333' as const;
const PROJECT_A = '0x4444444444444444444444444444444444444444' as const;
const PROJECT_B = '0x5555555555555555555555555555555555555555' as const;
const CONDITION = '0x6666666666666666666666666666666666666666' as const;
const TX_HASH = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const;

function makeProjectCreatedEvent(
  creator: `0x${string}`,
  assuranceContract: `0x${string}`,
  logIndex: number,
): RawEventFromCache {
  const topics = encodeEventTopics({
    abi: ProjectFactoryAbi,
    eventName: 'ProjectCreated',
    args: { creator, token: TOKEN, assuranceContract },
  });
  return {
    id: `${assuranceContract}-${logIndex}`,
    contractAddress: FACTORY,
    eventName: 'ProjectCreated',
    blockNumber: '100',
    blockTimestamp: '1700000000',
    transactionHash: TX_HASH,
    logIndex,
    topic0: topics[0] ?? null,
    topic1: (topics[1] ?? null) as string | null,
    topic2: (topics[2] ?? null) as string | null,
    topic3: (topics[3] ?? null) as string | null,
    data: encodeAbiParameters([{ type: 'address' }], [CONDITION]),
  };
}

describe('getUserCreatedProjects', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('filters ProjectCreated by creator topic and returns unique assurance contracts', async () => {
    const creatorEvents = [
      makeProjectCreatedEvent(CREATOR, PROJECT_A, 0),
      makeProjectCreatedEvent(CREATOR, PROJECT_B, 1),
      makeProjectCreatedEvent(CREATOR, PROJECT_A, 2),
    ];
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
      assert.strictEqual(url.searchParams.get('eventName'), 'ProjectCreated');
      assert.strictEqual(url.searchParams.get('topic1'), padAddressAsTopic(CREATOR));
      return new Response(JSON.stringify({ items: creatorEvents }), {
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
        delegatableNotes: '0x0000000000000000000000000000000000000000',
        noteIntent: '0x0000000000000000000000000000000000000000',
        alignmentAttestations: '0x0000000000000000000000000000000000000000',
        mutableRefUpdater: '0x0000000000000000000000000000000000000000',
        trustRegistry: '0x0000000000000000000000000000000000000000',
      },
    });

    const addresses = await getUserCreatedProjects(machinery, CREATOR);
    assert.deepStrictEqual(addresses, [PROJECT_A, PROJECT_B]);
  });

  it('does not include other creators when the cache honors topic1', async () => {
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
      const topic1 = url.searchParams.get('topic1');
      const items = topic1 === padAddressAsTopic(CREATOR)
        ? [makeProjectCreatedEvent(CREATOR, PROJECT_A, 0)]
        : [makeProjectCreatedEvent(OTHER, PROJECT_B, 0)];
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
        delegatableNotes: '0x0000000000000000000000000000000000000000',
        noteIntent: '0x0000000000000000000000000000000000000000',
        alignmentAttestations: '0x0000000000000000000000000000000000000000',
        mutableRefUpdater: '0x0000000000000000000000000000000000000000',
        trustRegistry: '0x0000000000000000000000000000000000000000',
      },
    });

    const addresses = await getUserCreatedProjects(machinery, CREATOR);
    assert.deepStrictEqual(addresses, [PROJECT_A]);
  });
});
