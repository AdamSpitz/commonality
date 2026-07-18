import assert from 'node:assert';
import { encodeAbiParameters, encodeEventTopics, parseAbiParameters, type Address } from 'viem';
import { createSDKMachinery } from '@commonality/sdk/machinery';
import { BeliefsAbi, ImplicationsAbi, PublishedDataAbi } from '@commonality/sdk/abis';
import { cidToBytes32, fakeIpfsCidV1, type RawEventFromCache } from '@commonality/sdk/utils';
import { computePublishedDataId, publishedDataIdToCid } from '@commonality/sdk/published-data';
import { ImplicationGraphNudger } from '../src/nudger.js';

const BELIEFS_CONTRACT = '0x00000000000000000000000000000000000000b1' as Address;
const IMPLICATIONS_CONTRACT = '0x00000000000000000000000000000000000000b2' as Address;
const PUBLISHED_DATA_CONTRACT = '0x00000000000000000000000000000000000000b3' as Address;
const ATTESTER = '0x4444444444444444444444444444444444444444' as Address;
const USER = '0x1111111111111111111111111111111111111111' as Address;
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

function makeDirectSupportEvent(statementCid: string, logIndex = 0): RawEventFromCache {
  const topics = encodeEventTopics({
    abi: BeliefsAbi,
    eventName: 'DirectSupport',
    args: { user: USER, statementId: cidToBytes32(statementCid) },
  });
  return {
    id: `support-${statementCid}-${logIndex}`,
    contractAddress: BELIEFS_CONTRACT,
    eventName: 'DirectSupport',
    blockNumber: '100',
    blockTimestamp: '1700000000',
    transactionHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    logIndex,
    topic0: topicAt(topics, 0),
    topic1: topicAt(topics, 1),
    topic2: topicAt(topics, 2),
    topic3: null,
    data: encodeAbiParameters(parseAbiParameters('uint8'), [1]),
  };
}

function makeImplicationEvent(fromCid: string, toCid: string, logIndex = 0): RawEventFromCache {
  const topics = encodeEventTopics({
    abi: ImplicationsAbi,
    eventName: 'ImplicationAttestation',
    args: { attester: ATTESTER, fromStatementCid: cidToBytes32(fromCid), toStatementCid: cidToBytes32(toCid) },
  });
  return {
    id: `implication-${fromCid}-${toCid}-${logIndex}`,
    contractAddress: IMPLICATIONS_CONTRACT,
    eventName: 'ImplicationAttestation',
    blockNumber: '101',
    blockTimestamp: '1700000001',
    transactionHash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    logIndex,
    topic0: topicAt(topics, 0),
    topic1: topicAt(topics, 1),
    topic2: topicAt(topics, 2),
    topic3: topicAt(topics, 3),
    data: encodeAbiParameters(parseAbiParameters('bytes32'), [ZERO_BYTES32]),
  };
}

function makeDataRetractedEvent(dataId: `0x${string}`, logIndex = 0): RawEventFromCache {
  const topics = encodeEventTopics({
    abi: PublishedDataAbi,
    eventName: 'DataRetracted',
    args: { publisher: USER, dataId },
  });
  return {
    id: `retraction-${dataId}-${logIndex}`,
    contractAddress: PUBLISHED_DATA_CONTRACT,
    eventName: 'DataRetracted',
    blockNumber: '102',
    blockTimestamp: '1700000002',
    transactionHash: '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    logIndex,
    topic0: topicAt(topics, 0),
    topic1: topicAt(topics, 1),
    topic2: topicAt(topics, 2),
    topic3: null,
    data: '0x',
  };
}

describe('ImplicationGraphNudger retraction re-anchor mode', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('creates nudges scoped to implications out of retracted PublishedData statements', async () => {
    const retractedDataId = computePublishedDataId(new TextEncoder().encode('retracted statement'));
    const retractedCid = publishedDataIdToCid(retractedDataId);
    const suggestedCid = fakeIpfsCidV1('reanchor-suggested');
    const unrelatedCid = fakeIpfsCidV1('reanchor-unrelated');

    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = new URL(requestUrlString(input));
      const eventName = url.searchParams.get('eventName');
      const topic2 = url.searchParams.get('topic2');

      let items: RawEventFromCache[] = [];
      if (eventName === 'DataRetracted') {
        items = [makeDataRetractedEvent(retractedDataId)];
      } else if (eventName === 'ImplicationAttestation' && topic2 === cidToBytes32(retractedCid)) {
        items = [makeImplicationEvent(retractedCid, suggestedCid)];
      } else if (eventName === 'DirectSupport' && topic2 === cidToBytes32(suggestedCid)) {
        items = [makeDirectSupportEvent(suggestedCid)];
      } else if (eventName === 'DirectSupport' && topic2 === cidToBytes32(unrelatedCid)) {
        items = [makeDirectSupportEvent(unrelatedCid)];
      }

      return new Response(JSON.stringify({ items }), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch;

    const machinery = createSDKMachinery({
      eventCacheUrl: 'http://localhost:42069',
      ipfsConfig: { shouldUseMock: true },
      contractAddresses: {
        beliefs: BELIEFS_CONTRACT,
        implications: IMPLICATIONS_CONTRACT,
        publishedData: PUBLISHED_DATA_CONTRACT,
        assuranceContractFactory: '0x0000000000000000000000000000000000000000',
        erc1155Factory: '0x0000000000000000000000000000000000000000',
        marketplaceFactory: '0x0000000000000000000000000000000000000000',
        delegatableNotes: '0x0000000000000000000000000000000000000000',
        noteIntent: '0x0000000000000000000000000000000000000000',
        alignmentAttestations: '0x0000000000000000000000000000000000000000',
        mutableRefUpdater: '0x0000000000000000000000000000000000000000',
        trustRegistry: '0x0000000000000000000000000000000000000000',
      },
    });

    const nudges = await new ImplicationGraphNudger().generateRetractionReanchorNudges(machinery, {
      nudgerPrivateKey: '0x',
      ethereumRpcUrl: 'http://localhost:8545',
      indexerUrl: 'http://localhost:42069',
      ipfsApiUrl: 'http://localhost:5001',
      ipfsGatewayUrl: 'http://localhost:8080',
      name: 'test',
      description: 'test',
      sourceType: 'implication-graph',
      version: '0.1.0',
      nudgePublicationsContractAddress: '0x0000000000000000000000000000000000000000',
    });

    assert.deepStrictEqual(nudges.map(({ targetStatementCid, suggestedStatementCid }) => ({ targetStatementCid, suggestedStatementCid })), [
      { targetStatementCid: retractedCid, suggestedStatementCid: suggestedCid },
    ]);
    assert.match(nudges[0]?.reason ?? '', /retracted/);
  });
});
