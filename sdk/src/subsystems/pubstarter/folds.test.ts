import assert from 'assert';
import { foldProject, foldContributions, foldProjectTokens } from './folds.js';
import type {
  AssuranceContractCreatedEvent,
  AssuranceContractInitializedEvent,
  ContractMetadataUpdatedEvent,
  ERC1155OfferedEvent,
  ERC1155BoughtEvent,
  ERC1155SoldEvent,
  AssuranceContractWithdrawalEvent,
} from './events.js';
import type { ProjectEvent } from './folds.js';
import { fakeIpfsCidV1 } from '../../utils/test-helpers.js';

const PROJECT_ADDR = '0x1111111111111111111111111111111111111111' as const;
const CREATOR = '0x2222222222222222222222222222222222222222' as const;
const RECIPIENT = '0x3333333333333333333333333333333333333333' as const;
const CONDITION = '0x4444444444444444444444444444444444444444' as const;
const ERC1155 = '0x5555555555555555555555555555555555555555' as const;
const PARTICIPANT_A = '0x6666666666666666666666666666666666666666' as const;
const PARTICIPANT_B = '0x7777777777777777777777777777777777777777' as const;
const TX_HASH = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const TX_HASH_2 = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const;
const TX_HASH_3 = '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc' as const;

const METADATA_CID = fakeIpfsCidV1('project-metadata');
const METADATA_CID_2 = fakeIpfsCidV1('project-metadata-v2');

// ============================================================================
// makeEvent helpers
// ============================================================================

function makeCreatedEvent(overrides: Partial<AssuranceContractCreatedEvent> = {}): AssuranceContractCreatedEvent {
  return {
    contractAddress: PROJECT_ADDR,
    assuranceContract: PROJECT_ADDR,
    creator: CREATOR,
    blockNumber: 100n,
    blockTimestamp: 1700000000n,
    transactionHash: TX_HASH,
    logIndex: 0,
    ...overrides,
  };
}

function makeInitializedEvent(overrides: Partial<AssuranceContractInitializedEvent> = {}): AssuranceContractInitializedEvent {
  return {
    contractAddress: PROJECT_ADDR,
    assuranceContract: PROJECT_ADDR,
    recipient: RECIPIENT,
    condition: CONDITION,
    blockNumber: 101n,
    blockTimestamp: 1700000100n,
    transactionHash: TX_HASH,
    logIndex: 1,
    ...overrides,
  };
}

function makeMetadataUpdatedEvent(overrides: Partial<ContractMetadataUpdatedEvent> = {}): ContractMetadataUpdatedEvent {
  return {
    contractAddress: PROJECT_ADDR,
    assuranceContract: PROJECT_ADDR,
    metadataCid: METADATA_CID,
    blockNumber: 102n,
    blockTimestamp: 1700000200n,
    transactionHash: TX_HASH,
    logIndex: 2,
    ...overrides,
  };
}

function makeOfferedEvent(overrides: Partial<ERC1155OfferedEvent> = {}): ERC1155OfferedEvent {
  return {
    contractAddress: PROJECT_ADDR,
    assuranceContract: PROJECT_ADDR,
    erc1155Addr: ERC1155,
    tokenId: 0n,
    price: 100000000000000000n, // 0.1 ETH
    blockNumber: 103n,
    blockTimestamp: 1700000300n,
    transactionHash: TX_HASH,
    logIndex: 3,
    ...overrides,
  };
}

function makeBoughtEvent(overrides: Partial<ERC1155BoughtEvent> = {}): ERC1155BoughtEvent {
  return {
    contractAddress: PROJECT_ADDR,
    assuranceContract: PROJECT_ADDR,
    participant: PARTICIPANT_A,
    erc1155Addr: ERC1155,
    totalCost: 100000000000000000n, // 0.1 ETH
    ids: [0n],
    counts: [1n],
    blockNumber: 200n,
    blockTimestamp: 1700001000n,
    transactionHash: TX_HASH_2,
    logIndex: 0,
    ...overrides,
  };
}

function makeSoldEvent(overrides: Partial<ERC1155SoldEvent> = {}): ERC1155SoldEvent {
  return {
    contractAddress: PROJECT_ADDR,
    assuranceContract: PROJECT_ADDR,
    participant: PARTICIPANT_A,
    erc1155Addr: ERC1155,
    totalRefund: 100000000000000000n, // 0.1 ETH
    ids: [0n],
    counts: [1n],
    blockNumber: 300n,
    blockTimestamp: 1700002000n,
    transactionHash: TX_HASH_3,
    logIndex: 0,
    ...overrides,
  };
}

function makeWithdrawalEvent(overrides: Partial<AssuranceContractWithdrawalEvent> = {}): AssuranceContractWithdrawalEvent {
  return {
    contractAddress: PROJECT_ADDR,
    assuranceContract: PROJECT_ADDR,
    value: 500000000000000000n, // 0.5 ETH
    blockNumber: 400n,
    blockTimestamp: 1700003000n,
    transactionHash: TX_HASH_3,
    logIndex: 0,
    ...overrides,
  };
}

// Convenience wrapper to build ProjectEvent array
function wrap(created?: boolean, initialized?: boolean): ProjectEvent[] {
  const events: ProjectEvent[] = [];
  if (created) events.push({ type: 'created', event: makeCreatedEvent() });
  if (initialized) events.push({ type: 'initialized', event: makeInitializedEvent() });
  return events;
}

// ============================================================================
// foldProject
// ============================================================================

describe('foldProject', () => {
  it('returns null for empty events', () => {
    assert.strictEqual(foldProject([]), null);
  });

  it('returns basic project from created + initialized events', () => {
    const events: ProjectEvent[] = [
      { type: 'created', event: makeCreatedEvent() },
      { type: 'initialized', event: makeInitializedEvent() },
    ];
    const result = foldProject(events);
    assert.ok(result !== null);
    assert.strictEqual(result.id, PROJECT_ADDR);
    assert.strictEqual(result.recipient, RECIPIENT);
    assert.strictEqual(result.conditionAddress, CONDITION);
    assert.strictEqual(result.totalReceived, '0');
    assert.strictEqual(result.createdAt, '1700000000');
    assert.strictEqual(result.marketplaceAddress, null);
  });

  it('sets erc1155Address from first tokenOffered event', () => {
    const events: ProjectEvent[] = [
      { type: 'created', event: makeCreatedEvent() },
      { type: 'initialized', event: makeInitializedEvent() },
      { type: 'tokenOffered', event: makeOfferedEvent() },
    ];
    const result = foldProject(events);
    assert.ok(result !== null);
    assert.strictEqual(result.erc1155Address, ERC1155);
  });

  it('erc1155Address is first offered address (does not change on subsequent offers)', () => {
    const OTHER_ERC1155 = '0x8888888888888888888888888888888888888888' as `0x${string}`;
    const events: ProjectEvent[] = [
      { type: 'created', event: makeCreatedEvent() },
      { type: 'tokenOffered', event: makeOfferedEvent({ erc1155Addr: ERC1155, logIndex: 0 }) },
      { type: 'tokenOffered', event: makeOfferedEvent({ erc1155Addr: OTHER_ERC1155, tokenId: 1n, logIndex: 1 }) },
    ];
    const result = foldProject(events);
    assert.ok(result !== null);
    assert.strictEqual(result.erc1155Address, ERC1155);
  });

  it('metadataCid uses last-write-wins', () => {
    const events: ProjectEvent[] = [
      { type: 'created', event: makeCreatedEvent() },
      { type: 'metadataUpdated', event: makeMetadataUpdatedEvent({ metadataCid: METADATA_CID, blockNumber: 102n }) },
      { type: 'metadataUpdated', event: makeMetadataUpdatedEvent({ metadataCid: METADATA_CID_2, blockNumber: 110n, logIndex: 1 }) },
    ];
    const result = foldProject(events);
    assert.ok(result !== null);
    assert.strictEqual(result.metadataCid, METADATA_CID_2);
  });

  it('totalReceived accumulates bought totalCost', () => {
    const events: ProjectEvent[] = [
      ...wrap(true, true),
      { type: 'bought', event: makeBoughtEvent({ totalCost: 100000000000000000n, blockNumber: 200n }) },
      { type: 'bought', event: makeBoughtEvent({ participant: PARTICIPANT_B, totalCost: 200000000000000000n, blockNumber: 201n, logIndex: 1 }) },
    ];
    const result = foldProject(events);
    assert.ok(result !== null);
    assert.strictEqual(result.totalReceived, '300000000000000000');
  });

  it('totalReceived decreases by sold totalRefund', () => {
    const events: ProjectEvent[] = [
      ...wrap(true, true),
      { type: 'bought', event: makeBoughtEvent({ totalCost: 500000000000000000n, blockNumber: 200n }) },
      { type: 'sold', event: makeSoldEvent({ totalRefund: 100000000000000000n, blockNumber: 300n }) },
    ];
    const result = foldProject(events);
    assert.ok(result !== null);
    assert.strictEqual(result.totalReceived, '400000000000000000');
  });

  it('withdrawal does not affect totalReceived', () => {
    const events: ProjectEvent[] = [
      ...wrap(true, true),
      { type: 'bought', event: makeBoughtEvent({ totalCost: 500000000000000000n, blockNumber: 200n }) },
      { type: 'withdrawal', event: makeWithdrawalEvent({ value: 500000000000000000n, blockNumber: 400n }) },
    ];
    const result = foldProject(events);
    assert.ok(result !== null);
    assert.strictEqual(result.totalReceived, '500000000000000000');
  });

  it('id is inferred from initialized event if no created event', () => {
    const events: ProjectEvent[] = [
      { type: 'initialized', event: makeInitializedEvent() },
    ];
    const result = foldProject(events);
    assert.ok(result !== null);
    assert.strictEqual(result.id, PROJECT_ADDR);
  });

  it('metadataCid is undefined when no metadata event', () => {
    const events: ProjectEvent[] = [
      { type: 'created', event: makeCreatedEvent() },
    ];
    const result = foldProject(events);
    assert.ok(result !== null);
    assert.strictEqual(result.metadataCid, undefined);
  });

  it('erc1155Address is empty string when no tokenOffered event', () => {
    const events: ProjectEvent[] = [
      ...wrap(true, true),
    ];
    const result = foldProject(events);
    assert.ok(result !== null);
    assert.strictEqual(result.erc1155Address, '');
  });
});

// ============================================================================
// foldContributions
// ============================================================================

describe('foldContributions', () => {
  it('returns empty arrays for empty input', () => {
    const result = foldContributions([]);
    assert.deepStrictEqual(result.contributions, []);
    assert.deepStrictEqual(result.refunds, []);
  });

  it('maps a single bought event to a contribution', () => {
    const event = makeBoughtEvent();
    const result = foldContributions([event]);
    assert.strictEqual(result.contributions.length, 1);
    assert.strictEqual(result.refunds.length, 0);
    const c = result.contributions[0]!;
    assert.strictEqual(c.id, `${TX_HASH_2}-0`);
    assert.strictEqual(c.participant, PARTICIPANT_A);
    assert.strictEqual(c.projectAddress, PROJECT_ADDR);
    assert.strictEqual(c.erc1155Address, ERC1155);
    assert.strictEqual(c.totalCost, '100000000000000000');
    assert.strictEqual(c.tokenIds, JSON.stringify(['0']));
    assert.strictEqual(c.tokenCounts, JSON.stringify(['1']));
    assert.strictEqual(c.createdAt, '1700001000');
    assert.strictEqual(c.blockNumber, '200');
    assert.strictEqual(c.transactionHash, TX_HASH_2);
  });

  it('maps a single sold event to a refund', () => {
    const event = makeSoldEvent();
    const result = foldContributions([event]);
    assert.strictEqual(result.contributions.length, 0);
    assert.strictEqual(result.refunds.length, 1);
    const r = result.refunds[0]!;
    assert.strictEqual(r.id, `${TX_HASH_3}-0`);
    assert.strictEqual(r.participant, PARTICIPANT_A);
    assert.strictEqual(r.projectAddress, PROJECT_ADDR);
    assert.strictEqual(r.erc1155Address, ERC1155);
    assert.strictEqual(r.totalRefund, '100000000000000000');
    assert.strictEqual(r.tokenIds, JSON.stringify(['0']));
    assert.strictEqual(r.tokenCounts, JSON.stringify(['1']));
    assert.strictEqual(r.createdAt, '1700002000');
    assert.strictEqual(r.blockNumber, '300');
    assert.strictEqual(r.transactionHash, TX_HASH_3);
  });

  it('separates multiple bought and sold events correctly', () => {
    const events = [
      makeBoughtEvent({ participant: PARTICIPANT_A, blockNumber: 200n, transactionHash: TX_HASH_2, logIndex: 0 }),
      makeBoughtEvent({ participant: PARTICIPANT_B, blockNumber: 201n, transactionHash: TX_HASH_2, logIndex: 1 }),
      makeSoldEvent({ participant: PARTICIPANT_A, blockNumber: 300n, transactionHash: TX_HASH_3, logIndex: 0 }),
    ];
    const result = foldContributions(events);
    assert.strictEqual(result.contributions.length, 2);
    assert.strictEqual(result.refunds.length, 1);
  });

  it('contribution id is transactionHash-logIndex', () => {
    const event = makeBoughtEvent({ transactionHash: TX_HASH_2, logIndex: 5 });
    const result = foldContributions([event]);
    assert.strictEqual(result.contributions[0]!.id, `${TX_HASH_2}-5`);
  });

  it('refund id is transactionHash-logIndex', () => {
    const event = makeSoldEvent({ transactionHash: TX_HASH_3, logIndex: 3 });
    const result = foldContributions([event]);
    assert.strictEqual(result.refunds[0]!.id, `${TX_HASH_3}-3`);
  });

  it('serializes multiple token ids and counts as JSON', () => {
    const event = makeBoughtEvent({
      ids: [0n, 1n, 2n],
      counts: [5n, 3n, 1n],
    });
    const result = foldContributions([event]);
    const c = result.contributions[0]!;
    assert.strictEqual(c.tokenIds, JSON.stringify(['0', '1', '2']));
    assert.strictEqual(c.tokenCounts, JSON.stringify(['5', '3', '1']));
  });

  it('does not mutate the input array', () => {
    const events = [makeBoughtEvent(), makeSoldEvent()];
    const copy = [...events];
    foldContributions(events);
    assert.deepStrictEqual(events, copy);
  });
});

// ============================================================================
// foldProjectTokens
// ============================================================================

describe('foldProjectTokens', () => {
  it('returns empty array for empty input', () => {
    assert.deepStrictEqual(foldProjectTokens([]), []);
  });

  it('maps a single offered event to a ProjectToken', () => {
    const event = makeOfferedEvent();
    const result = foldProjectTokens([event]);
    assert.strictEqual(result.length, 1);
    const t = result[0]!;
    assert.strictEqual(t.projectAddress, PROJECT_ADDR);
    assert.strictEqual(t.erc1155Address, ERC1155);
    assert.strictEqual(t.tokenId, '0');
    assert.strictEqual(t.price, '100000000000000000');
    assert.strictEqual(t.createdAt, '1700000300');
  });

  it('different tokenIds produce separate records', () => {
    const events = [
      makeOfferedEvent({ tokenId: 0n, logIndex: 0 }),
      makeOfferedEvent({ tokenId: 1n, logIndex: 1 }),
      makeOfferedEvent({ tokenId: 2n, logIndex: 2 }),
    ];
    const result = foldProjectTokens(events);
    assert.strictEqual(result.length, 3);
    const tokenIds = result.map((t) => t.tokenId).sort();
    assert.deepStrictEqual(tokenIds, ['0', '1', '2']);
  });

  it('re-offering same token updates price (last-write-wins)', () => {
    const events = [
      makeOfferedEvent({ tokenId: 0n, price: 100000000000000000n, blockNumber: 103n, logIndex: 0 }),
      makeOfferedEvent({ tokenId: 0n, price: 200000000000000000n, blockNumber: 110n, logIndex: 1 }),
    ];
    const result = foldProjectTokens(events);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]!.price, '200000000000000000');
  });

  it('key comparison is case-insensitive for addresses', () => {
    const lowerAddr = '0x5555555555555555555555555555555555555555' as `0x${string}`;
    const upperAddr = '0x5555555555555555555555555555555555555555'.toUpperCase() as `0x${string}`;
    const events = [
      makeOfferedEvent({ erc1155Addr: lowerAddr, tokenId: 0n, price: 100000000000000000n, blockNumber: 103n }),
      makeOfferedEvent({ erc1155Addr: upperAddr, tokenId: 0n, price: 200000000000000000n, blockNumber: 110n, logIndex: 1 }),
    ];
    const result = foldProjectTokens(events);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]!.price, '200000000000000000');
  });

  it('does not mutate the input array', () => {
    const events = [makeOfferedEvent()];
    const copy = [...events];
    foldProjectTokens(events);
    assert.deepStrictEqual(events, copy);
  });
});
