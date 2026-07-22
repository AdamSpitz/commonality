import assert from 'assert';
import {
  foldProject,
  foldContributionsFromEvents,
  foldProjectTokens,
  foldTokenBurns,
  PROJECT_FOLD_VERSION,
  CONTRIBUTIONS_FOLD_VERSION,
  TOKEN_BURNS_FOLD_VERSION,
} from './folds.js';
import type {
  AssuranceContractCreatedEvent,
  AssuranceContractInitializedEvent,
  ContractMetadataUpdatedEvent,
  ERC1155OfferedEvent,
  ERC1155BoughtEvent,
  ERC1155SoldEvent,
  AssuranceContractWithdrawalEvent,
  TransferSingleEvent,
  TransferBatchEvent,
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
const BUYER_A = '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC' as const;
const BUYER_B = '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD' as const;
const BURNER = '0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE' as const;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
const TX_HASH = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const TX_HASH_2 = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const;
const TX_HASH_3 = '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc' as const;
const TX_HASH_4 = '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd' as const;
const TX_HASH_5 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' as const;

const METADATA_CID = fakeIpfsCidV1('project-metadata');
const METADATA_CID_2 = fakeIpfsCidV1('project-metadata-v2');
const USDC_CURRENCY = {
  kind: 'erc20' as const,
  symbol: 'USDC',
  decimals: 6,
  tokenAddress: '0x1212121212121212121212121212121212121212',
  tokenType: 0,
};

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
    uri: METADATA_CID,
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
    erc1155Addr: ERC1155,
    id: 0n,
    price: 100000000000000000n,
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
    participant: PARTICIPANT_A,
    erc1155Addr: ERC1155,
    totalCost: 100000000000000000n,
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
    participant: PARTICIPANT_A,
    erc1155Addr: ERC1155,
    totalCost: 100000000000000000n,
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
    recipient: RECIPIENT,
    value: 1000000000000000000n,
    blockNumber: 400n,
    blockTimestamp: 1700003000n,
    transactionHash: TX_HASH_4,
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
    const { project, accumulator } = foldProject([]);
    assert.strictEqual(project, null);
    assert.strictEqual(accumulator.foldVersion, PROJECT_FOLD_VERSION);
  });

  it('returns basic project from created + initialized events', () => {
    const events: ProjectEvent[] = [
      { type: 'created', event: makeCreatedEvent() },
      { type: 'initialized', event: makeInitializedEvent() },
    ];
    const { project: result } = foldProject(events);
    assert.ok(result !== null);
    assert.strictEqual(result.id, PROJECT_ADDR);
    assert.strictEqual(result.recipient, RECIPIENT);
    assert.strictEqual(result.conditionAddress, CONDITION);
    assert.strictEqual(result.totalReceived, '0');
    assert.strictEqual(result.createdAt, '1700000000');
    assert.strictEqual(result.marketplaceAddress, null);
  });

  it('uses the provided funding currency instead of hardcoding ETH', () => {
    const events: ProjectEvent[] = [
      { type: 'created', event: makeCreatedEvent() },
      { type: 'initialized', event: makeInitializedEvent() },
    ];
    const { project: result } = foldProject(events, undefined, USDC_CURRENCY);
    assert.ok(result !== null);
    assert.deepStrictEqual(result.fundingCurrency, USDC_CURRENCY);
  });

  it('sets erc1155Address from first tokenOffered event', () => {
    const events: ProjectEvent[] = [
      { type: 'created', event: makeCreatedEvent() },
      { type: 'initialized', event: makeInitializedEvent() },
      { type: 'tokenOffered', event: makeOfferedEvent() },
    ];
    const { project: result } = foldProject(events);
    assert.ok(result !== null);
    assert.strictEqual(result.erc1155Address, ERC1155);
  });

  it('erc1155Address is first offered address (does not change on subsequent offers)', () => {
    const OTHER_ERC1155 = '0x8888888888888888888888888888888888888888' as `0x${string}`;
    const events: ProjectEvent[] = [
      { type: 'created', event: makeCreatedEvent() },
      { type: 'tokenOffered', event: makeOfferedEvent({ erc1155Addr: ERC1155, logIndex: 0 }) },
      { type: 'tokenOffered', event: makeOfferedEvent({ erc1155Addr: OTHER_ERC1155, id: 1n, logIndex: 1 }) },
    ];
    const { project: result } = foldProject(events);
    assert.ok(result !== null);
    assert.strictEqual(result.erc1155Address, ERC1155);
  });

  it('metadataCid uses last-write-wins', () => {
    const events: ProjectEvent[] = [
      { type: 'created', event: makeCreatedEvent() },
      { type: 'metadataUpdated', event: makeMetadataUpdatedEvent({ uri: METADATA_CID, blockNumber: 102n }) },
      { type: 'metadataUpdated', event: makeMetadataUpdatedEvent({ uri: METADATA_CID_2, blockNumber: 110n, logIndex: 1 }) },
    ];
    const { project: result } = foldProject(events);
    assert.ok(result !== null);
    assert.strictEqual(result.metadataCid, METADATA_CID_2);
  });

  it('normalizes ipfs:// metadata references to bare CIDs for metadata readers', () => {
    const events: ProjectEvent[] = [
      { type: 'created', event: makeCreatedEvent() },
      { type: 'metadataUpdated', event: makeMetadataUpdatedEvent({ uri: `ipfs://${METADATA_CID}/` }) },
    ];
    const { project: result } = foldProject(events);
    assert.ok(result !== null);
    assert.strictEqual(result.metadataCid, METADATA_CID);
  });

  it('normalizes ipfs:// metadata references with query strings', () => {
    const events: ProjectEvent[] = [
      { type: 'created', event: makeCreatedEvent() },
      { type: 'metadataUpdated', event: makeMetadataUpdatedEvent({ uri: ` ipfs://${METADATA_CID}?filename=metadata.json ` }) },
    ];
    const { project: result } = foldProject(events);
    assert.ok(result !== null);
    assert.strictEqual(result.metadataCid, METADATA_CID);
  });

  it('totalReceived accumulates bought totalCost', () => {
    const events: ProjectEvent[] = [
      ...wrap(true, true),
      { type: 'bought', event: makeBoughtEvent({ totalCost: 100000000000000000n, blockNumber: 200n }) },
      { type: 'bought', event: makeBoughtEvent({ participant: PARTICIPANT_B, totalCost: 200000000000000000n, blockNumber: 201n, logIndex: 1 }) },
    ];
    const { project: result } = foldProject(events);
    assert.ok(result !== null);
    assert.strictEqual(result.totalReceived, '300000000000000000');
  });

  it('totalReceived decreases by sold totalRefund', () => {
    const events: ProjectEvent[] = [
      ...wrap(true, true),
      { type: 'bought', event: makeBoughtEvent({ totalCost: 500000000000000000n, blockNumber: 200n }) },
      { type: 'sold', event: makeSoldEvent({ totalCost: 100000000000000000n, blockNumber: 300n }) },
    ];
    const { project: result } = foldProject(events);
    assert.ok(result !== null);
    assert.strictEqual(result.totalReceived, '400000000000000000');
  });

  it('withdrawal does not affect totalReceived', () => {
    const events: ProjectEvent[] = [
      ...wrap(true, true),
      { type: 'bought', event: makeBoughtEvent({ totalCost: 500000000000000000n, blockNumber: 200n }) },
      { type: 'withdrawal', event: makeWithdrawalEvent({ value: 500000000000000000n, blockNumber: 400n }) },
    ];
    const { project: result } = foldProject(events);
    assert.ok(result !== null);
    assert.strictEqual(result.totalReceived, '500000000000000000');
  });

  it('id is inferred from initialized event if no created event', () => {
    const events: ProjectEvent[] = [
      { type: 'initialized', event: makeInitializedEvent() },
    ];
    const { project: result } = foldProject(events);
    assert.ok(result !== null);
    assert.strictEqual(result.id, PROJECT_ADDR);
  });

  it('metadataCid is undefined when no metadata event', () => {
    const events: ProjectEvent[] = [
      { type: 'created', event: makeCreatedEvent() },
    ];
    const { project: result } = foldProject(events);
    assert.ok(result !== null);
    assert.strictEqual(result.metadataCid, undefined);
  });

  it('erc1155Address is empty string when no tokenOffered event', () => {
    const events: ProjectEvent[] = [
      ...wrap(true, true),
    ];
    const { project: result } = foldProject(events);
    assert.ok(result !== null);
    assert.strictEqual(result.erc1155Address, '');
  });

  it('resumable: folding in two halves produces the same result as one full fold', () => {
    const allEvents: ProjectEvent[] = [
      ...wrap(true, true),
      { type: 'bought', event: makeBoughtEvent({ totalCost: 100000000000000000n, blockNumber: 200n }) },
      { type: 'metadataUpdated', event: makeMetadataUpdatedEvent({ uri: METADATA_CID, blockNumber: 210n }) },
      { type: 'bought', event: makeBoughtEvent({ participant: PARTICIPANT_B, totalCost: 200000000000000000n, blockNumber: 220n, logIndex: 1 }) },
      { type: 'sold', event: makeSoldEvent({ totalCost: 50000000000000000n, blockNumber: 300n }) },
    ];
    const half = Math.floor(allEvents.length / 2);
    const { accumulator } = foldProject(allEvents.slice(0, half));
    const { project: resumedResult } = foldProject(allEvents.slice(half), accumulator);
    const { project: fullResult } = foldProject(allEvents);
    assert.strictEqual(accumulator.foldVersion, PROJECT_FOLD_VERSION);
    assert.deepStrictEqual(resumedResult, fullResult);
  });

  it('does not re-apply events already covered by a resumable accumulator cursor', () => {
    const initialEvents: ProjectEvent[] = [
      ...wrap(true, true),
      { type: 'bought', event: makeBoughtEvent({ totalCost: 100000000000000000n, blockNumber: 200n, logIndex: 4 }) },
    ];
    const { accumulator } = foldProject(initialEvents);

    const replayedAndNewEvents: ProjectEvent[] = [
      { type: 'bought', event: makeBoughtEvent({ totalCost: 100000000000000000n, blockNumber: 200n, logIndex: 4 }) },
      { type: 'bought', event: makeBoughtEvent({ participant: PARTICIPANT_B, totalCost: 200000000000000000n, blockNumber: 200n, logIndex: 5 }) },
      { type: 'bought', event: makeBoughtEvent({ participant: PARTICIPANT_B, totalCost: 300000000000000000n, blockNumber: 201n, logIndex: 0 }) },
    ];

    const { project } = foldProject(replayedAndNewEvents, accumulator);
    assert.ok(project !== null);
    assert.strictEqual(project.totalReceived, '600000000000000000');
  });

  it('ignores a stale project accumulator version', () => {
    const fullEvents: ProjectEvent[] = [
      ...wrap(true, true),
      { type: 'bought', event: makeBoughtEvent({ totalCost: 200000000000000000n }) },
    ];
    const staleAccumulator = {
      foldVersion: 999 as typeof PROJECT_FOLD_VERSION,
      id: 'stale',
      erc1155Address: 'stale',
      recipient: 'stale',
      conditionAddress: null,
      metadataCid: 'stale',
      createdAt: '1',
      blockNumber: '1',
      lastEventBlockNumber: '1',
      lastEventLogIndex: 0,
      totalReceived: 999n,
    };

    const { project } = foldProject(fullEvents, staleAccumulator);
    assert.ok(project !== null);
    assert.strictEqual(project.id, PROJECT_ADDR);
    assert.strictEqual(project.totalReceived, '200000000000000000');
  });
});

// ============================================================================
// foldContributionsFromEvents
// ============================================================================

describe('foldContributionsFromEvents', () => {
  it('uses the provided currency for contributions and refunds', () => {
    const { contributions, refunds } = foldContributionsFromEvents(
      [makeBoughtEvent()],
      [makeSoldEvent()],
      undefined,
      USDC_CURRENCY,
    );

    assert.strictEqual(contributions.length, 1);
    assert.deepStrictEqual(contributions[0].currency, USDC_CURRENCY);
    assert.strictEqual(refunds.length, 1);
    assert.deepStrictEqual(refunds[0].currency, USDC_CURRENCY);
  });

  it('returns empty arrays for empty input', () => {
    const result = foldContributionsFromEvents([], []);
    assert.deepStrictEqual(result.contributions, []);
    assert.deepStrictEqual(result.refunds, []);
    assert.strictEqual(result.accumulator.foldVersion, CONTRIBUTIONS_FOLD_VERSION);
  });

  it('maps a single bought event to a contribution', () => {
    const event = makeBoughtEvent();
    const result = foldContributionsFromEvents([event], []);
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
    const result = foldContributionsFromEvents([], [event]);
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
    const boughtEvents = [
      makeBoughtEvent({ participant: PARTICIPANT_A, blockNumber: 200n, transactionHash: TX_HASH_2, logIndex: 0 }),
      makeBoughtEvent({ participant: PARTICIPANT_B, blockNumber: 201n, transactionHash: TX_HASH_2, logIndex: 1 }),
    ];
    const soldEvents = [
      makeSoldEvent({ participant: PARTICIPANT_A, blockNumber: 300n, transactionHash: TX_HASH_3, logIndex: 0 }),
    ];
    const result = foldContributionsFromEvents(boughtEvents, soldEvents);
    assert.strictEqual(result.contributions.length, 2);
    assert.strictEqual(result.refunds.length, 1);
  });

  it('contribution id is transactionHash-logIndex', () => {
    const event = makeBoughtEvent({ transactionHash: TX_HASH_2, logIndex: 5 });
    const result = foldContributionsFromEvents([event], []);
    assert.strictEqual(result.contributions[0]!.id, `${TX_HASH_2}-5`);
  });

  it('refund id is transactionHash-logIndex', () => {
    const event = makeSoldEvent({ transactionHash: TX_HASH_3, logIndex: 3 });
    const result = foldContributionsFromEvents([], [event]);
    assert.strictEqual(result.refunds[0]!.id, `${TX_HASH_3}-3`);
  });

  it('serializes multiple token ids and counts as JSON', () => {
    const event = makeBoughtEvent({
      ids: [0n, 1n, 2n],
      counts: [5n, 3n, 1n],
    });
    const result = foldContributionsFromEvents([event], []);
    const c = result.contributions[0]!;
    assert.strictEqual(c.tokenIds, JSON.stringify(['0', '1', '2']));
    assert.strictEqual(c.tokenCounts, JSON.stringify(['5', '3', '1']));
  });

  it('does not mutate the input arrays', () => {
    const boughtEvents = [makeBoughtEvent()];
    const soldEvents = [makeSoldEvent()];
    const boughtCopy = [...boughtEvents];
    const soldCopy = [...soldEvents];
    foldContributionsFromEvents(boughtEvents, soldEvents);
    assert.deepStrictEqual(boughtEvents, boughtCopy);
    assert.deepStrictEqual(soldEvents, soldCopy);
  });

  it('resumable state carries foldVersion and resumes correctly', () => {
    const allBought = [
      makeBoughtEvent({ transactionHash: TX_HASH_2, logIndex: 0 }),
      makeBoughtEvent({ participant: PARTICIPANT_B, transactionHash: TX_HASH_4, logIndex: 1 }),
    ];
    const allSold = [
      makeSoldEvent({ transactionHash: TX_HASH_3, logIndex: 0 }),
      makeSoldEvent({ participant: PARTICIPANT_B, transactionHash: TX_HASH_5, logIndex: 1 }),
    ];

    const partial = foldContributionsFromEvents(allBought.slice(0, 1), allSold.slice(0, 1));
    const resumed = foldContributionsFromEvents(allBought.slice(1), allSold.slice(1), partial.accumulator);
    const full = foldContributionsFromEvents(allBought, allSold);

    assert.strictEqual(partial.accumulator.foldVersion, CONTRIBUTIONS_FOLD_VERSION);
    assert.deepStrictEqual(resumed.contributions, full.contributions);
    assert.deepStrictEqual(resumed.refunds, full.refunds);
  });

  it('ignores stale contributions accumulator versions', () => {
    const result = foldContributionsFromEvents(
      [makeBoughtEvent()],
      [],
      {
        foldVersion: 999 as typeof CONTRIBUTIONS_FOLD_VERSION,
        contributions: [{
          id: 'stale',
          participant: PARTICIPANT_B,
          projectAddress: PROJECT_ADDR,
          erc1155Address: ERC1155,
          tokenIds: JSON.stringify(['9']),
          tokenCounts: JSON.stringify(['9']),
          currency: USDC_CURRENCY,
          totalCost: '9',
          createdAt: '9',
          blockNumber: '9',
          transactionHash: TX_HASH,
        }],
        refunds: [],
      },
    );

    assert.strictEqual(result.contributions.length, 1);
    assert.strictEqual(result.contributions[0]!.id, `${TX_HASH_2}-0`);
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
      makeOfferedEvent({ id: 0n, logIndex: 0 }),
      makeOfferedEvent({ id: 1n, logIndex: 1 }),
      makeOfferedEvent({ id: 2n, logIndex: 2 }),
    ];
    const result = foldProjectTokens(events);
    assert.strictEqual(result.length, 3);
    const tokenIds = result.map((t) => t.tokenId).sort();
    assert.deepStrictEqual(tokenIds, ['0', '1', '2']);
  });

  it('re-offering same token updates price (last-write-wins)', () => {
    const events = [
      makeOfferedEvent({ id: 0n, price: 100000000000000000n, blockNumber: 103n, logIndex: 0 }),
      makeOfferedEvent({ id: 0n, price: 200000000000000000n, blockNumber: 110n, logIndex: 1 }),
    ];
    const result = foldProjectTokens(events);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]!.price, '200000000000000000');
  });

  it('key comparison is case-insensitive for addresses', () => {
    const lowerAddr = '0x5555555555555555555555555555555555555555' as `0x${string}`;
    const upperAddr = '0x5555555555555555555555555555555555555555'.toUpperCase() as `0x${string}`;
    const events = [
      makeOfferedEvent({ erc1155Addr: lowerAddr, id: 0n, price: 100000000000000000n, blockNumber: 103n }),
      makeOfferedEvent({ erc1155Addr: upperAddr, id: 0n, price: 200000000000000000n, blockNumber: 110n, logIndex: 1 }),
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

function makeTransferSingleEvent(overrides: Partial<TransferSingleEvent> = {}): TransferSingleEvent {
  return {
    contractAddress: ERC1155,
    operator: BURNER,
    from: BURNER,
    to: ZERO_ADDRESS,
    id: 1n,
    value: 5n,
    blockNumber: 600n,
    blockTimestamp: 1700020000n,
    transactionHash: TX_HASH_5,
    logIndex: 0,
    ...overrides,
  };
}

function makeTransferBatchEvent(overrides: Partial<TransferBatchEvent> = {}): TransferBatchEvent {
  return {
    contractAddress: ERC1155,
    operator: BURNER,
    from: BURNER,
    to: ZERO_ADDRESS,
    ids: [1n, 2n],
    values: [5n, 3n],
    blockNumber: 601n,
    blockTimestamp: 1700020100n,
    transactionHash: TX_HASH_5,
    logIndex: 1,
    ...overrides,
  };
}

// ============================================================================
// foldTokenBurns
// ============================================================================

describe('foldTokenBurns', () => {
  it('returns empty array for empty input', () => {
    const result = foldTokenBurns([]);
    assert.deepStrictEqual(result.burns, []);
    assert.strictEqual(result.accumulator.foldVersion, TOKEN_BURNS_FOLD_VERSION);
  });

  it('maps a TransferSingle burn to a TokenBurn', () => {
    const event = makeTransferSingleEvent();
    const result = foldTokenBurns([event]);
    assert.strictEqual(result.burns.length, 1);
    const burn = result.burns[0]!;
    assert.strictEqual(burn.id, `${TX_HASH_5}-0`);
    assert.strictEqual(burn.erc1155Address, ERC1155);
    assert.strictEqual(burn.burner, BURNER);
    assert.strictEqual(burn.tokenIds, JSON.stringify(['1']));
    assert.strictEqual(burn.tokenCounts, JSON.stringify(['5']));
    assert.strictEqual(burn.createdAt, '1700020000');
    assert.strictEqual(burn.blockNumber, '600');
    assert.strictEqual(burn.transactionHash, TX_HASH_5);
  });

  it('maps a TransferBatch burn to a TokenBurn', () => {
    const event = makeTransferBatchEvent();
    const result = foldTokenBurns([event]);
    assert.strictEqual(result.burns.length, 1);
    const burn = result.burns[0]!;
    assert.strictEqual(burn.tokenIds, JSON.stringify(['1', '2']));
    assert.strictEqual(burn.tokenCounts, JSON.stringify(['5', '3']));
  });

  it('ignores non-burn TransferSingle events (to != zero address)', () => {
    const event = makeTransferSingleEvent({ to: BUYER_A });
    const result = foldTokenBurns([event]);
    assert.strictEqual(result.burns.length, 0);
  });

  it('ignores non-burn TransferBatch events (to != zero address)', () => {
    const event = makeTransferBatchEvent({ to: BUYER_A });
    const result = foldTokenBurns([event]);
    assert.strictEqual(result.burns.length, 0);
  });

  it('processes mix of burn and non-burn events', () => {
    const events = [
      makeTransferSingleEvent({ to: ZERO_ADDRESS, logIndex: 0 }),
      makeTransferSingleEvent({ to: BUYER_A, logIndex: 1 }),
      makeTransferBatchEvent({ to: ZERO_ADDRESS, logIndex: 2 }),
      makeTransferBatchEvent({ to: BUYER_B, logIndex: 3 }),
    ];
    const result = foldTokenBurns(events);
    assert.strictEqual(result.burns.length, 2);
  });

  it('handles multiple single burns', () => {
    const events = [
      makeTransferSingleEvent({ id: 1n, value: 2n, logIndex: 0, transactionHash: TX_HASH_4 }),
      makeTransferSingleEvent({ id: 3n, value: 7n, logIndex: 1, transactionHash: TX_HASH_5 }),
    ];
    const result = foldTokenBurns(events);
    assert.strictEqual(result.burns.length, 2);
    assert.strictEqual(result.burns[0]!.tokenIds, JSON.stringify(['1']));
    assert.strictEqual(result.burns[0]!.tokenCounts, JSON.stringify(['2']));
    assert.strictEqual(result.burns[1]!.tokenIds, JSON.stringify(['3']));
    assert.strictEqual(result.burns[1]!.tokenCounts, JSON.stringify(['7']));
  });

  it('zero-address comparison is case-insensitive', () => {
    // Even if to is checksummed differently, should still match zero address
    const event = makeTransferSingleEvent({ to: '0x0000000000000000000000000000000000000000' as `0x${string}` });
    const result = foldTokenBurns([event]);
    assert.strictEqual(result.burns.length, 1);
  });

  it('does not mutate the input array', () => {
    const events = [makeTransferSingleEvent()];
    const copy = [...events];
    foldTokenBurns(events);
    assert.deepStrictEqual(events, copy);
  });

  it('resumable state carries foldVersion and resumes correctly', () => {
    const allEvents = [
      makeTransferSingleEvent({ id: 1n, value: 2n, logIndex: 0, transactionHash: TX_HASH_4 }),
      makeTransferBatchEvent({ ids: [3n], values: [4n], logIndex: 1, transactionHash: TX_HASH_5 }),
    ];

    const partial = foldTokenBurns(allEvents.slice(0, 1));
    const resumed = foldTokenBurns(allEvents.slice(1), partial.accumulator);
    const full = foldTokenBurns(allEvents);

    assert.strictEqual(partial.accumulator.foldVersion, TOKEN_BURNS_FOLD_VERSION);
    assert.deepStrictEqual(resumed.burns, full.burns);
  });

  it('ignores stale token burn accumulator versions', () => {
    const result = foldTokenBurns(
      [makeTransferSingleEvent()],
      {
        foldVersion: 999 as typeof TOKEN_BURNS_FOLD_VERSION,
        burns: [{
          id: 'stale',
          erc1155Address: ERC1155,
          burner: BURNER,
          tokenIds: JSON.stringify(['9']),
          tokenCounts: JSON.stringify(['9']),
          createdAt: '9',
          blockNumber: '9',
          transactionHash: TX_HASH,
        }],
      },
    );

    assert.strictEqual(result.burns.length, 1);
    assert.strictEqual(result.burns[0]!.id, `${TX_HASH_5}-0`);
  });
});
