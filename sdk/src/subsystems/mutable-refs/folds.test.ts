import assert from 'assert';
import { foldMutableRef, foldRefHistory, foldUserList } from './folds.js';
import type { RefUpdatedEvent } from './events.js';

const OWNER = '0x1111111111111111111111111111111111111111' as const;
const CONTRACT_ADDRESS = '0x9999999999999999999999999999999999999999' as const;
const TX_HASH = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const TX_HASH_2 = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const;

function makeEvent(overrides: Partial<RefUpdatedEvent> = {}): RefUpdatedEvent {
  return {
    contractAddress: CONTRACT_ADDRESS,
    owner: OWNER,
    name: 'my-ref',
    currentRefValue: 'bafy...value1',
    blockNumber: 100n,
    blockTimestamp: 1700000000n,
    transactionHash: TX_HASH,
    logIndex: 0,
    ...overrides,
  };
}

// ============================================================================
// foldMutableRef
// ============================================================================

describe('foldMutableRef', () => {
  it('returns null for empty events', () => {
    assert.strictEqual(foldMutableRef([]), null);
  });

  it('returns correct fields from a single event', () => {
    const event = makeEvent();
    const result = foldMutableRef([event]);
    assert.ok(result !== null);
    assert.strictEqual(result.owner, OWNER);
    assert.strictEqual(result.name, 'my-ref');
    assert.strictEqual(result.value, 'bafy...value1');
    assert.strictEqual(result.updatedAt, '1700000000');
    assert.strictEqual(result.updatedAtBlock, '100');
    assert.strictEqual(result.transactionHash, TX_HASH);
  });

  it('returns the last event value (last-write-wins)', () => {
    const events = [
      makeEvent({ blockNumber: 100n, blockTimestamp: 1700000000n, currentRefValue: 'value1', transactionHash: TX_HASH }),
      makeEvent({ blockNumber: 200n, blockTimestamp: 1700001000n, currentRefValue: 'value2', transactionHash: TX_HASH_2, logIndex: 0 }),
    ];
    const result = foldMutableRef(events);
    assert.ok(result !== null);
    assert.strictEqual(result.value, 'value2');
    assert.strictEqual(result.updatedAt, '1700001000');
    assert.strictEqual(result.updatedAtBlock, '200');
    assert.strictEqual(result.transactionHash, TX_HASH_2);
  });

  it('preserves owner and name from latest event', () => {
    const events = [
      makeEvent({ blockNumber: 100n, currentRefValue: 'old' }),
      makeEvent({ blockNumber: 200n, currentRefValue: 'new', owner: '0x2222222222222222222222222222222222222222' as const }),
    ];
    const result = foldMutableRef(events);
    assert.ok(result !== null);
    assert.strictEqual(result.owner, '0x2222222222222222222222222222222222222222');
  });
});

// ============================================================================
// foldRefHistory
// ============================================================================

describe('foldRefHistory', () => {
  it('returns empty array for empty events', () => {
    assert.deepStrictEqual(foldRefHistory([]), []);
  });

  it('maps a single event to a single RefUpdate', () => {
    const event = makeEvent({ blockNumber: 100n, blockTimestamp: 1700000000n, logIndex: 3 });
    const result = foldRefHistory([event]);
    assert.strictEqual(result.length, 1);
    const update = result[0]!;
    assert.strictEqual(update.owner, OWNER);
    assert.strictEqual(update.name, 'my-ref');
    assert.strictEqual(update.value, 'bafy...value1');
    assert.strictEqual(update.blockNumber, '100');
    assert.strictEqual(update.timestamp, '1700000000');
    assert.strictEqual(update.transactionHash, TX_HASH);
    assert.strictEqual(update.logIndex, 3);
  });

  it('generates ID as owner:name:blockNumber:logIndex', () => {
    const event = makeEvent({ blockNumber: 100n, logIndex: 3 });
    const result = foldRefHistory([event]);
    assert.strictEqual(result[0]!.id, `${OWNER.toLowerCase()}:my-ref:100:3`);
  });

  it('returns all events as RefUpdate records in order', () => {
    const events = [
      makeEvent({ blockNumber: 100n, blockTimestamp: 1700000000n, currentRefValue: 'value1', transactionHash: TX_HASH, logIndex: 0 }),
      makeEvent({ blockNumber: 200n, blockTimestamp: 1700001000n, currentRefValue: 'value2', transactionHash: TX_HASH_2, logIndex: 1 }),
    ];
    const result = foldRefHistory(events);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0]!.value, 'value2'); // newest first
    assert.strictEqual(result[1]!.value, 'value1');
  });

  it('does not mutate the input array', () => {
    const events = [makeEvent()];
    const copy = [...events];
    foldRefHistory(events);
    assert.deepStrictEqual(events, copy);
  });
});

// ============================================================================
// foldUserList
// ============================================================================

describe('foldUserList', () => {
  it('reconstructs an append-only list from event values', () => {
    const events = [
      makeEvent({ currentRefValue: 'bafyone', blockNumber: 1n }),
      makeEvent({ currentRefValue: 'bafytwo', blockNumber: 2n }),
    ];
    assert.deepStrictEqual(foldUserList(events), ['bafyone', 'bafytwo']);
  });

  it('deduplicates append events by default', () => {
    const events = [
      makeEvent({ currentRefValue: 'bafyone', blockNumber: 1n }),
      makeEvent({ currentRefValue: 'bafyone', blockNumber: 2n }),
    ];
    assert.deepStrictEqual(foldUserList(events), ['bafyone']);
    assert.deepStrictEqual(foldUserList(events, { deduplicate: false }), ['bafyone', 'bafyone']);
  });

  it('folds legacy JSON list values before newer append events', () => {
    const events = [
      makeEvent({ currentRefValue: JSON.stringify({ statements: ['bafylegacy1', 'bafylegacy2'], version: 1 }), blockNumber: 1n }),
      makeEvent({ currentRefValue: 'bafynew', blockNumber: 2n }),
    ];
    assert.deepStrictEqual(foldUserList(events), ['bafylegacy1', 'bafylegacy2', 'bafynew']);
  });
});
