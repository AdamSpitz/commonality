import assert from 'assert';
import { encodeAbiParameters, encodeEventTopics } from 'viem';
import type {
  ChannelControlTakenEvent,
  ChannelVerifiedEvent,
  ContentItemRegisteredEvent,
  ContractVetoedEvent,
  CreatorContractCreatedEvent,
  DepositedEvent,
} from './events.js';
import { foldAllContentFundingEvents } from './folds.js';
import {
  buildChannelCanonicalIdMap,
  getChannelOverview,
  getContentSubjectId,
  getStatementSupportingContent,
  selectLatestContentAttestations,
  getContentItemStatus,
  getContractsForChannel,
  getAllChannelOverviews,
  getOwnerForCanonicalChannelId,
  getVetoableContracts,
} from './queries.js';
import type { Project } from '../lazy-giving/types.js';
import { createSDKMachinery } from '../../machinery.js';
import { cidToBytes32 } from '../../utils/cid-types.js';
import { fakeIpfsCidV1 } from '../../utils/test-helpers.js';
import type { RawEventFromCache } from '../../utils/eventCacheClient.js';
import { AlignmentAttestationsAbi, ContentRegistryAbi } from '../../abis.js';

const CHANNEL_A = 'twitter:uid:creator-a';
const CHANNEL_B = 'twitter:uid:creator-b';
const OWNER_A = '0x1111111111111111111111111111111111111111' as const;
const OWNER_B = '0x2222222222222222222222222222222222222222' as const;
const OWNER_C = '0x3333333333333333333333333333333333333333' as const;
const CONTRACT_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const CONTRACT_B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const;
const CONTRACT_C = '0xcccccccccccccccccccccccccccccccccccccccc' as const;
const TX_HASH = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as const;

function makeRegisteredEvent(overrides: Partial<ContentItemRegisteredEvent> = {}): ContentItemRegisteredEvent {
  return {
    type: 'ContentItemRegistered',
    contractAddress: '0x9999999999999999999999999999999999999999',
    contentId: 1n,
    assuranceContract: CONTRACT_A,
    canonicalId: 'twitter:uid:creator-a:1',
    blockNumber: 100n,
    blockTimestamp: 1000n,
    transactionHash: TX_HASH,
    logIndex: 0,
    ...overrides,
  };
}

function makeVerifiedEvent(overrides: Partial<ChannelVerifiedEvent> = {}): ChannelVerifiedEvent {
  return {
    type: 'ChannelVerified',
    contractAddress: '0x9999999999999999999999999999999999999998',
    channelId: CHANNEL_A,
    owner: OWNER_A,
    blockNumber: 90n,
    blockTimestamp: 900n,
    transactionHash: TX_HASH,
    logIndex: 0,
    ...overrides,
  };
}

function makeControlTakenEvent(overrides: Partial<ChannelControlTakenEvent> = {}): ChannelControlTakenEvent {
  return {
    type: 'ChannelControlTaken',
    contractAddress: '0x9999999999999999999999999999999999999998',
    channelId: CHANNEL_A,
    owner: OWNER_A,
    blockNumber: 120n,
    blockTimestamp: 1200n,
    transactionHash: TX_HASH,
    logIndex: 1,
    ...overrides,
  };
}

function makeDepositedEvent(overrides: Partial<DepositedEvent> = {}): DepositedEvent {
  return {
    type: 'Deposited',
    contractAddress: '0x9999999999999999999999999999999999999997',
    channelId: CHANNEL_A,
    from: OWNER_A,
    amount: 25n,
    blockNumber: 121n,
    blockTimestamp: 1210n,
    transactionHash: TX_HASH,
    logIndex: 0,
    ...overrides,
  };
}

function makeContractCreatedEvent(overrides: Partial<CreatorContractCreatedEvent> = {}): CreatorContractCreatedEvent {
  return {
    type: 'CreatorContractCreated',
    contractAddress: CONTRACT_A,
    channelId: CHANNEL_A,
    creator: OWNER_A,
    isThirdParty: true,
    blockNumber: 100n,
    blockTimestamp: 1000n,
    transactionHash: TX_HASH,
    logIndex: 0,
    ...overrides,
  };
}

function makeVetoedEvent(overrides: Partial<ContractVetoedEvent> = {}): ContractVetoedEvent {
  return {
    type: 'ContractVetoed',
    contractAddress: CONTRACT_C,
    channelId: CHANNEL_A,
    blockNumber: 130n,
    blockTimestamp: 1300n,
    transactionHash: TX_HASH,
    logIndex: 0,
    ...overrides,
  };
}

function makeProject(overrides: Partial<Project> = {}): Project {
  const defaultErc1155 = '0xdddddddddddddddddddddddddddddddddddddddd' as const;
  return {
    id: CONTRACT_A,
    erc1155Address: defaultErc1155,
    marketplaceAddress: null,
    recipient: OWNER_A,
    threshold: '100',
    deadline: '2000',
    totalReceived: '50',
    conditionAddress: null,
    metadataCid: undefined,
    createdAt: '1000',
    blockNumber: '100',
    ...overrides,
  };
}

describe('content-funding query helpers', () => {
  const state = foldAllContentFundingEvents(
    [
      makeRegisteredEvent(),
      makeRegisteredEvent({
        contentId: 2n,
        assuranceContract: CONTRACT_B,
        canonicalId: 'twitter:uid:creator-a:2',
        logIndex: 1,
      }),
      makeRegisteredEvent({
        contentId: 3n,
        assuranceContract: CONTRACT_C,
        canonicalId: 'twitter:uid:creator-a:3',
        logIndex: 2,
      }),
      makeRegisteredEvent({
        contentId: 4n,
        assuranceContract: '0x1212121212121212121212121212121212121212',
        canonicalId: 'twitter:uid:creator-b:4',
        blockNumber: 101n,
        logIndex: 3,
      }),
    ],
    [
      makeVerifiedEvent(),
      makeControlTakenEvent(),
      makeVerifiedEvent({
        channelId: CHANNEL_B,
        owner: '0x2222222222222222222222222222222222222222',
        blockNumber: 95n,
        blockTimestamp: 950n,
        logIndex: 2,
      }),
    ],
    [makeDepositedEvent()],
    [
      makeContractCreatedEvent(),
      makeContractCreatedEvent({
        contractAddress: CONTRACT_B,
        creator: OWNER_B,
        isThirdParty: false,
        blockNumber: 110n,
        blockTimestamp: 1100n,
        logIndex: 1,
      }),
      makeContractCreatedEvent({
        contractAddress: CONTRACT_C,
        creator: OWNER_C,
        isThirdParty: true,
        blockNumber: 115n,
        blockTimestamp: 1150n,
        logIndex: 2,
      }),
      makeContractCreatedEvent({
        contractAddress: '0x1212121212121212121212121212121212121212',
        channelId: CHANNEL_B,
        creator: '0x1313131313131313131313131313131313131313',
        isThirdParty: true,
        blockNumber: 101n,
        blockTimestamp: 1010n,
        logIndex: 3,
      }),
    ],
  );

  const projects: Project[] = [
    makeProject(),
    makeProject({
      id: CONTRACT_B,
      erc1155Address: OWNER_B,
      totalReceived: '150',
      createdAt: '1100',
      blockNumber: '110',
    }),
    makeProject({
      id: CONTRACT_C,
      erc1155Address: OWNER_C,
      totalReceived: '10',
      createdAt: '1150',
      blockNumber: '115',
    }),
  ];

  it('returns contract summaries for a channel with funding progress and status', () => {
    const contracts = getContractsForChannel(state, CHANNEL_A, {
      projects,
      vetoedEvents: [makeVetoedEvent()],
      now: 1500n,
    });

    assert.strictEqual(contracts.length, 3);

    const thirdParty = contracts.find((contract) => contract.contractAddress === CONTRACT_A);
    assert.ok(thirdParty);
    assert.strictEqual(thirdParty.status, 'active');
    assert.strictEqual(thirdParty.fundingProgress, 0.5);
    assert.deepStrictEqual(thirdParty.contentItems.map((item) => item.contentId.toString()), ['1']);

    const creator = contracts.find((contract) => contract.contractAddress === CONTRACT_B);
    assert.ok(creator);
    assert.strictEqual(creator.status, 'successful');
    assert.strictEqual(creator.fundingProgress, 1.5);

    const vetoed = contracts.find((contract) => contract.contractAddress === CONTRACT_C);
    assert.ok(vetoed);
    assert.strictEqual(vetoed.status, 'vetoed');
  });

  it('looks up the current owner from a canonical channel ID', () => {
    assert.strictEqual(getOwnerForCanonicalChannelId(state, CHANNEL_A), OWNER_A);
    assert.strictEqual(getOwnerForCanonicalChannelId(state, CHANNEL_B), OWNER_B);
    assert.strictEqual(getOwnerForCanonicalChannelId(state, 'twitter:uid:missing'), null);
  });

  it('builds a channel overview from folded state', () => {
    const overview = getChannelOverview(state, CHANNEL_A, {
      projects,
      vetoedEvents: [makeVetoedEvent()],
      now: 1500n,
    });

    assert.strictEqual(overview.channel.state, 'creator-controlled');
    assert.strictEqual(overview.channel.controlTakenAt, 1200n);
    assert.strictEqual(overview.escrow.balance, 25n);
    assert.strictEqual(overview.escrow.totalDeposited, 25n);
    assert.strictEqual(overview.contracts.length, 3);
    assert.deepStrictEqual(overview.contentItems.map((item) => item.contentId.toString()), ['1', '2', '3']);
  });

  it('returns content-item status with the linked contract summary', () => {
    const itemStatus = getContentItemStatus(state, 1n, {
      projects,
      now: 1500n,
    });

    assert.strictEqual(itemStatus.registrationStatus, 'active');
    assert.strictEqual(itemStatus.canonicalId, 'twitter:uid:creator-a:1');
    assert.strictEqual(itemStatus.contractAddress, CONTRACT_A);
    assert.ok(itemStatus.contract);
    assert.strictEqual(itemStatus.contract.status, 'active');
  });

  it('recovers canonical channel IDs from colon-separated Substack content IDs', () => {
    const substackChannelId = '0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0';
    const substackState = foldAllContentFundingEvents(
      [
        makeRegisteredEvent({
          assuranceContract: CONTRACT_A,
          canonicalId: 'substack:smartwriter:seed-post',
        }),
      ],
      [
        makeVerifiedEvent({
          channelId: substackChannelId,
          owner: OWNER_A,
        }),
      ],
      [],
      [
        makeContractCreatedEvent({
          contractAddress: CONTRACT_A,
          channelId: substackChannelId,
        }),
      ],
    );

    const canonicalIds = buildChannelCanonicalIdMap(substackState);
    assert.strictEqual(canonicalIds.get(substackChannelId), 'substack:smartwriter');

    const overviews = getAllChannelOverviews(substackState);
    assert.strictEqual(overviews.length, 1);
    assert.strictEqual(overviews[0]?.canonicalChannelId, 'substack:smartwriter');
  });

  it('links content items to checksum-cased creator contract addresses', () => {
    const checksumContract = '0x24B3c7704709ed1491473F30393FFc93cFB0FC34' as const;
    const checksumState = foldAllContentFundingEvents(
      [
        makeRegisteredEvent({
          assuranceContract: checksumContract,
          canonicalId: 'twitter:uid:123456789:987654321',
        }),
      ],
      [
        makeVerifiedEvent({
          channelId: '0xfeed',
          owner: OWNER_A,
        }),
      ],
      [],
      [
        makeContractCreatedEvent({
          contractAddress: checksumContract,
          channelId: '0xfeed',
        }),
      ],
    );

    const contracts = getContractsForChannel(checksumState, '0xfeed');
    assert.strictEqual(contracts.length, 1);
    assert.deepStrictEqual(contracts[0]?.contentItems.map((item) => item.canonicalId), [
      'twitter:uid:123456789:987654321',
    ]);

    const canonicalIds = buildChannelCanonicalIdMap(checksumState);
    assert.strictEqual(canonicalIds.get('0xfeed'), 'twitter:uid:123456789');
  });

  it('returns an unregistered content-item status when absent', () => {
    assert.deepStrictEqual(getContentItemStatus(state, 999n), {
      contentId: 999n,
      registrationStatus: 'unregistered',
      canonicalId: null,
      contractAddress: null,
      contract: null,
    });
  });

  it('filters vetoable contracts to active third-party contracts within the veto window', () => {
    const vetoable = getVetoableContracts(state, CHANNEL_A, {
      projects,
      vetoedEvents: [makeVetoedEvent()],
      now: 1300n,
      vetoWindowSeconds: 200n,
    });

    assert.deepStrictEqual(vetoable.map((contract) => contract.contractAddress), [CONTRACT_A]);
    assert.deepStrictEqual(
      getVetoableContracts(state, CHANNEL_A, {
        projects,
        now: 1501n,
        vetoWindowSeconds: 300n,
      }),
      [],
    );
  });

  it('keeps the latest content attestation per attester and statement claim', () => {
    const attestations = selectLatestContentAttestations([
      {
        attester: OWNER_A,
        subjectId: '0xsubject1' as `0x${string}`,
        statementId: 'bafy-statement-new',
        topicStatementId: 'bafy-topic',
        contractAddress: CONTRACT_A,
        blockNumber: 100n,
        blockTimestamp: 1000n,
        transactionHash: TX_HASH,
        logIndex: 0,
      },
      {
        attester: OWNER_B,
        subjectId: '0xsubject1' as `0x${string}`,
        statementId: 'bafy-statement-b',
        topicStatementId: 'bafy-topic',
        contractAddress: CONTRACT_A,
        blockNumber: 105n,
        blockTimestamp: 1050n,
        transactionHash: TX_HASH,
        logIndex: 1,
      },
      {
        attester: OWNER_A,
        subjectId: '0xsubject1' as `0x${string}`,
        statementId: 'bafy-statement-new',
        topicStatementId: 'bafy-topic',
        contractAddress: CONTRACT_A,
        blockNumber: 110n,
        blockTimestamp: 1100n,
        transactionHash: TX_HASH,
        logIndex: 2,
      },
    ]);

    assert.deepStrictEqual(attestations.map(attestation => ({
      attester: attestation.attester,
      statementCid: attestation.statementCid,
      blockNumber: attestation.blockNumber,
    })), [
      { attester: OWNER_A, statementCid: 'bafy-statement-new', blockNumber: 110n },
      { attester: OWNER_B, statementCid: 'bafy-statement-b', blockNumber: 105n },
    ]);
  });

  it('filters latest content attestations to a requested attester', () => {
    const attestations = selectLatestContentAttestations([
      {
        attester: OWNER_A,
        subjectId: '0xsubject1' as `0x${string}`,
        statementId: 'bafy-statement-new',
        topicStatementId: 'bafy-topic',
        contractAddress: CONTRACT_A,
        blockNumber: 100n,
        blockTimestamp: 1000n,
        transactionHash: TX_HASH,
        logIndex: 0,
      },
      {
        attester: OWNER_A.toUpperCase() as typeof OWNER_A,
        subjectId: '0xsubject1' as `0x${string}`,
        statementId: 'bafy-statement-new',
        topicStatementId: 'bafy-topic',
        contractAddress: CONTRACT_A,
        blockNumber: 101n,
        blockTimestamp: 1010n,
        transactionHash: TX_HASH,
        logIndex: 1,
      },
      {
        attester: OWNER_B,
        subjectId: '0xsubject1' as `0x${string}`,
        statementId: 'bafy-statement-b',
        topicStatementId: 'bafy-topic',
        contractAddress: CONTRACT_A,
        blockNumber: 102n,
        blockTimestamp: 1020n,
        transactionHash: TX_HASH,
        logIndex: 2,
      },
    ], OWNER_A);

    assert.deepStrictEqual(attestations.map(attestation => ({
      attester: attestation.attester,
      statementCid: attestation.statementCid,
    })), [
      { attester: OWNER_A.toUpperCase(), statementCid: 'bafy-statement-new' },
    ]);
  });
});

describe('getStatementSupportingContent', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const ALIGNMENT = '0xaaaa0000000000000000000000000000000000aa' as const;
  const CONTENT_REGISTRY = '0xcccc0000000000000000000000000000000000cc' as const;
  const CHANNEL_REGISTRY = '0xdddd0000000000000000000000000000000000dd' as const;
  const CHANNEL_ESCROW = '0xeeee0000000000000000000000000000000000ee' as const;
  const CREATOR_FACTORY = '0xffff0000000000000000000000000000000000ff' as const;
  const ATTESTER = '0x1111111111111111111111111111111111111111' as const;
  const OTHER_ATTESTER = '0x2222222222222222222222222222222222222222' as const;

  const STATEMENT = fakeIpfsCidV1('statement-s');
  const NONINFLAMMATORY_TOPIC = fakeIpfsCidV1('noninflammatory-meta');

  const SUPPORTING_CANONICAL = 'twitter:uid:creator:supporting';
  const SUPPORT_ONLY_CANONICAL = 'twitter:uid:creator:support-only';

  function makeRegisteredRawEvent(contentId: bigint, canonicalId: string, logIndex: number): RawEventFromCache {
    const topics = encodeEventTopics({
      abi: ContentRegistryAbi,
      eventName: 'ContentItemRegistered',
      args: { contentId, assuranceContract: CONTRACT_A },
    });
    return {
      id: `${CONTENT_REGISTRY}-${contentId}`,
      contractAddress: CONTENT_REGISTRY,
      eventName: 'ContentItemRegistered',
      blockNumber: '100',
      blockTimestamp: '1000',
      transactionHash: TX_HASH,
      logIndex,
      topic0: (topics[0] as string) ?? null,
      topic1: (topics[1] as string) ?? null,
      topic2: (topics[2] as string) ?? null,
      topic3: null,
      data: encodeAbiParameters([{ type: 'string' }], [canonicalId]),
    };
  }

  function makeAttestationRawEvent(params: {
    attester: `0x${string}`;
    canonicalId: string;
    statementCid: `b${string}`;
    topicStatementCid: `b${string}`;
    blockNumber: string;
    logIndex: number;
  }): RawEventFromCache {
    const topics = encodeEventTopics({
      abi: AlignmentAttestationsAbi,
      eventName: 'AlignmentAttestation',
      args: {
        attester: params.attester,
        subjectId: getContentSubjectId(params.canonicalId) as `0x${string}`,
        statementId: cidToBytes32(params.statementCid),
      },
    });
    return {
      id: `${params.attester}-${params.canonicalId}-${params.statementCid}-${params.blockNumber}`,
      contractAddress: ALIGNMENT,
      eventName: 'AlignmentAttestation',
      blockNumber: params.blockNumber,
      blockTimestamp: params.blockNumber,
      transactionHash: TX_HASH,
      logIndex: params.logIndex,
      topic0: (topics[0] as string) ?? null,
      topic1: (topics[1] as string) ?? null,
      topic2: (topics[2] as string) ?? null,
      topic3: (topics[3] as string) ?? null,
      data: encodeAbiParameters([{ type: 'bytes32' }], [cidToBytes32(params.topicStatementCid)]),
    };
  }

  function makeMachinery() {
    return createSDKMachinery(
      'http://localhost:42069/graphql',
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
        alignmentAttestations: ALIGNMENT,
        mutableRefUpdater: '0x0000000000000000000000000000000000000000',
        trustRegistry: '0x0000000000000000000000000000000000000000',
        contentRegistry: CONTENT_REGISTRY,
        channelRegistry: CHANNEL_REGISTRY,
        channelEscrow: CHANNEL_ESCROW,
        creatorContractFactory: CREATOR_FACTORY,
      },
    );
  }

  // SUPPORTING_CANONICAL has both a support (statement=S) and a noninflammatory attestation;
  // SUPPORT_ONLY_CANONICAL has a support attestation but no noninflammatory attestation.
  function installFetch() {
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = new URL(typeof input === 'string' ? input : (input as Request).url);
      const eventName = url.searchParams.get('eventName');
      const contractAddress = url.searchParams.get('contractAddress')?.toLowerCase();
      const topic2 = url.searchParams.get('topic2');
      const topic3 = url.searchParams.get('topic3');

      let items: RawEventFromCache[] = [];

      if (contractAddress === CONTENT_REGISTRY.toLowerCase()) {
        items = [
          makeRegisteredRawEvent(1n, SUPPORTING_CANONICAL, 0),
          makeRegisteredRawEvent(2n, SUPPORT_ONLY_CANONICAL, 1),
        ];
      } else if (eventName === 'AlignmentAttestation' && topic3 === cidToBytes32(STATEMENT)) {
        // Support attestations: subject=C, statement=S, topicStatement=noninflammatory-meta
        items = [
          makeAttestationRawEvent({
            attester: ATTESTER,
            canonicalId: SUPPORTING_CANONICAL,
            statementCid: STATEMENT,
            topicStatementCid: NONINFLAMMATORY_TOPIC,
            blockNumber: '200',
            logIndex: 0,
          }),
          makeAttestationRawEvent({
            attester: ATTESTER,
            canonicalId: SUPPORT_ONLY_CANONICAL,
            statementCid: STATEMENT,
            topicStatementCid: NONINFLAMMATORY_TOPIC,
            blockNumber: '201',
            logIndex: 1,
          }),
        ];
      } else if (eventName === 'AlignmentAttestation' && topic2 === getContentSubjectId(SUPPORTING_CANONICAL)) {
        // Noninflammatory attestation: subject=C, statement=topic, topicStatement=topic
        items = [
          makeAttestationRawEvent({
            attester: ATTESTER,
            canonicalId: SUPPORTING_CANONICAL,
            statementCid: NONINFLAMMATORY_TOPIC,
            topicStatementCid: NONINFLAMMATORY_TOPIC,
            blockNumber: '199',
            logIndex: 0,
          }),
        ];
      } else if (eventName === 'AlignmentAttestation' && topic2 === getContentSubjectId(SUPPORT_ONLY_CANONICAL)) {
        items = []; // no noninflammatory attestation for this content
      }

      return new Response(JSON.stringify({ items }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;
  }

  it('returns only content that has both a support and a noninflammatory attestation', async () => {
    installFetch();
    const results = await getStatementSupportingContent(makeMachinery(), STATEMENT, {
      noninflammatoryTopicCid: NONINFLAMMATORY_TOPIC,
    });

    assert.strictEqual(results.length, 1);
    const record = results[0]!;
    assert.strictEqual(record.contentItem.canonicalId, SUPPORTING_CANONICAL);
    assert.strictEqual(record.supportAttestations.length, 1);
    assert.strictEqual(record.supportAttestations[0]?.statementCid, STATEMENT);
    assert.strictEqual(record.noninflammatoryAttestations.length, 1);
    assert.strictEqual(record.noninflammatoryAttestations[0]?.statementCid, NONINFLAMMATORY_TOPIC);
  });

  it('drops content whose support attestation comes from an untrusted attester', async () => {
    installFetch();
    const results = await getStatementSupportingContent(makeMachinery(), STATEMENT, {
      noninflammatoryTopicCid: NONINFLAMMATORY_TOPIC,
      trustedAttesters: [OTHER_ATTESTER],
    });
    assert.strictEqual(results.length, 0);
  });

  it('returns empty when alignmentAttestations is not configured', async () => {
    installFetch();
    const machinery = makeMachinery();
    machinery.contractAddresses = { ...machinery.contractAddresses!, alignmentAttestations: undefined as unknown as `0x${string}` };
    const results = await getStatementSupportingContent(machinery, STATEMENT, {
      noninflammatoryTopicCid: NONINFLAMMATORY_TOPIC,
    });
    assert.strictEqual(results.length, 0);
  });
});
