import assert from 'assert';
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
  getContentItemStatus,
  getContractsForChannel,
  getVetoableContracts,
} from './queries.js';
import type { Project } from '../pubstarter/types.js';

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
});
