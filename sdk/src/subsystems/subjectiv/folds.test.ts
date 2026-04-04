import assert from 'assert';
import { foldDirectTrustMapping } from './folds.js';
import type { TrustSetEvent } from './events.js';

const TRUSTER = '0x1111111111111111111111111111111111111111' as const;
const TRUSTEE_A = '0x2222222222222222222222222222222222222222' as const;
const TRUSTEE_B = '0x3333333333333333333333333333333333333333' as const;
const CONTRACT_ADDRESS = '0x9999999999999999999999999999999999999999' as const;
const TX_HASH = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;

function makeEvent(overrides: Partial<TrustSetEvent> = {}): TrustSetEvent {
  return {
    contractAddress: CONTRACT_ADDRESS,
    truster: TRUSTER,
    trustee: TRUSTEE_A,
    score: 75,
    blockNumber: 100n,
    blockTimestamp: 1700000000n,
    transactionHash: TX_HASH,
    logIndex: 0,
    ...overrides,
  };
}

describe('foldDirectTrustMapping', () => {
  it('returns an empty map for empty input', () => {
    assert.strictEqual(foldDirectTrustMapping([]).size, 0);
  });

  it('keeps the latest score for each trustee', () => {
    const mapping = foldDirectTrustMapping([
      makeEvent({ trustee: TRUSTEE_A, score: 20, blockNumber: 100n }),
      makeEvent({ trustee: TRUSTEE_A, score: 90, blockNumber: 200n }),
    ]);

    assert.strictEqual(mapping.get(TRUSTEE_A.toLowerCase()), 90);
  });

  it('drops zero-score revocations from the current mapping', () => {
    const mapping = foldDirectTrustMapping([
      makeEvent({ trustee: TRUSTEE_A, score: 50, blockNumber: 100n }),
      makeEvent({ trustee: TRUSTEE_A, score: 0, blockNumber: 200n }),
    ]);

    assert.strictEqual(mapping.has(TRUSTEE_A.toLowerCase()), false);
  });

  it('tracks multiple trustees independently', () => {
    const mapping = foldDirectTrustMapping([
      makeEvent({ trustee: TRUSTEE_A, score: 25 }),
      makeEvent({ trustee: TRUSTEE_B, score: 80, logIndex: 1 }),
    ]);

    assert.strictEqual(mapping.get(TRUSTEE_A.toLowerCase()), 25);
    assert.strictEqual(mapping.get(TRUSTEE_B.toLowerCase()), 80);
  });
});
