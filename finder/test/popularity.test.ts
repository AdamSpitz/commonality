import assert from 'assert';
import { getTopStatements, allStatementCids } from '../src/popularity.js';
import type { DirectSupportEvent } from '@commonality/sdk';

function fakeEvent(
  user: string,
  statementId: string,
  beliefState: number,
  blockNumber = 1n,
): DirectSupportEvent {
  return {
    user: user as `0x${string}`,
    statementId,
    beliefState,
    contractAddress: '0x1111111111111111111111111111111111111111' as `0x${string}`,
    blockNumber,
    blockTimestamp: 1000n,
    transactionHash: '0xaaa' as `0x${string}`,
    logIndex: 0,
  };
}

describe('getTopStatements', () => {
  it('returns statements sorted by believer count', () => {
    const events = [
      fakeEvent('0x01', 'cidA', 1),
      fakeEvent('0x02', 'cidA', 1),
      fakeEvent('0x03', 'cidA', 1),
      fakeEvent('0x01', 'cidB', 1),
      fakeEvent('0x01', 'cidC', 1),
      fakeEvent('0x02', 'cidC', 1),
    ];

    const top = getTopStatements(events, 10, 1);

    assert.strictEqual(top[0].cid, 'cidA');
    assert.strictEqual(top[0].believerCount, 3);
    assert.strictEqual(top[1].cid, 'cidC');
    assert.strictEqual(top[1].believerCount, 2);
    assert.strictEqual(top[2].cid, 'cidB');
    assert.strictEqual(top[2].believerCount, 1);
  });

  it('filters by minimum believer threshold', () => {
    const events = [
      fakeEvent('0x01', 'cidA', 1),
      fakeEvent('0x02', 'cidA', 1),
      fakeEvent('0x01', 'cidB', 1),
    ];

    const top = getTopStatements(events, 10, 2);

    assert.strictEqual(top.length, 1);
    assert.strictEqual(top[0].cid, 'cidA');
  });

  it('respects topN limit', () => {
    const events = [
      fakeEvent('0x01', 'cidA', 1),
      fakeEvent('0x02', 'cidA', 1),
      fakeEvent('0x01', 'cidB', 1),
      fakeEvent('0x02', 'cidB', 1),
      fakeEvent('0x01', 'cidC', 1),
      fakeEvent('0x02', 'cidC', 1),
    ];

    const top = getTopStatements(events, 2, 1);
    assert.strictEqual(top.length, 2);
  });

  it('handles disbelievers correctly (not counted as believers)', () => {
    const events = [
      fakeEvent('0x01', 'cidA', 1),
      fakeEvent('0x02', 'cidA', 2), // disbelieve
      fakeEvent('0x03', 'cidA', 0), // no opinion
    ];

    const top = getTopStatements(events, 10, 1);
    assert.strictEqual(top.length, 1);
    assert.strictEqual(top[0].believerCount, 1);
  });

  it('handles belief state changes (last-write-wins)', () => {
    const events = [
      fakeEvent('0x01', 'cidA', 1, 1n), // believe
      fakeEvent('0x01', 'cidA', 0, 2n), // change to no opinion
    ];

    const top = getTopStatements(events, 10, 1);
    assert.strictEqual(top.length, 0);
  });

  it('returns empty array when no events', () => {
    const top = getTopStatements([], 10, 1);
    assert.strictEqual(top.length, 0);
  });
});

describe('allStatementCids', () => {
  it('returns unique CIDs from events', () => {
    const events = [
      fakeEvent('0x01', 'cidA', 1),
      fakeEvent('0x02', 'cidA', 1),
      fakeEvent('0x01', 'cidB', 1),
    ];

    const cids = allStatementCids(events);
    assert.strictEqual(cids.size, 2);
    assert.ok(cids.has('cidA'));
    assert.ok(cids.has('cidB'));
  });
});
