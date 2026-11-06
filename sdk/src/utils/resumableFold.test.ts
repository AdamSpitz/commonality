import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MemoryFoldStore,
  isAtOrBeforeCursor,
  runResumableFold,
  type FoldCursor,
} from './resumableFold.js';

type Event = { blockNumber: string; logIndex: number; value: number };
type Acc = { total: number };

function definition(store: MemoryFoldStore, events: Event[], finalizedThrough: bigint | null) {
  const seen: FoldCursor[] = [];
  return {
    seen,
    fold: {
      id: 'sum',
      version: 1,
      key: 'chain::sum::1',
      store,
      empty: (): Acc => ({ total: 0 }),
      fetch: async (cursor: FoldCursor | null) => {
        if (cursor) seen.push(cursor);
        return { events, finalizedThrough };
      },
      position: (event: Event) => ({ blockNumber: event.blockNumber, logIndex: event.logIndex }),
      step: (accumulator: Acc, batch: Event[]) => ({
        total: batch.reduce((sum, event) => sum + event.value, accumulator.total),
      }),
      serialize: (accumulator: Acc) => accumulator,
      deserialize: (raw: unknown) => raw as Acc,
      finish: (accumulator: Acc) => accumulator.total,
    },
  };
}

describe('runResumableFold', () => {
  it('returns the complete view when optional storage is unavailable', async () => {
    const store = new MemoryFoldStore();
    store.get = async () => { throw new Error('storage unavailable'); };
    store.put = async () => { throw new Error('quota exceeded'); };
    const run = definition(store, [
      { blockNumber: '5', logIndex: 0, value: 10 },
      { blockNumber: '9', logIndex: 0, value: 1 },
    ], 5n);
    assert.equal(await runResumableFold(run.fold), 11);
  });
  it('matches a from-scratch fold when resumed across a block that has several events', async () => {
    const events: Event[] = [
      { blockNumber: '10', logIndex: 0, value: 1 },
      { blockNumber: '10', logIndex: 1, value: 2 },
      { blockNumber: '10', logIndex: 2, value: 4 },
      { blockNumber: '11', logIndex: 0, value: 8 },
    ];
    const store = new MemoryFoldStore();
    const first = definition(store, events.slice(0, 2), 10n);
    assert.equal(await runResumableFold(first.fold), 3);

    const second = definition(store, events, 11n);
    assert.equal(await runResumableFold(second.fold), 15);
    assert.deepEqual(second.seen, [{ blockNumber: '10', logIndex: 1 }]);
    assert.equal(isAtOrBeforeCursor({ blockNumber: '10', logIndex: 1 }, second.seen[0]!), true);
  });

  it('does not persist a reorged tail', async () => {
    const store = new MemoryFoldStore();
    const events: Event[] = [
      { blockNumber: '5', logIndex: 0, value: 10 },
      { blockNumber: '9', logIndex: 0, value: 100 },
    ];
    const first = definition(store, events, 5n);
    assert.equal(await runResumableFold(first.fold), 110);

    const reorged: Event[] = [
      { blockNumber: '5', logIndex: 0, value: 10 },
      { blockNumber: '9', logIndex: 0, value: 1 },
    ];
    const second = definition(store, reorged, 5n);
    assert.equal(await runResumableFold(second.fold), 11);
    const stored = await store.get('chain::sum::1');
    assert.equal((stored?.accumulator as Acc).total, 10);
    assert.deepEqual(stored?.cursor, { blockNumber: '5', logIndex: 0 });
  });

  it('discards a stored record whose version does not match', async () => {
    const store = new MemoryFoldStore();
    await store.put('chain::sum::1', {
      version: 0,
      cursor: { blockNumber: '5', logIndex: 0 },
      accumulator: { total: 999 },
    });
    const run = definition(store, [{ blockNumber: '6', logIndex: 0, value: 4 }], 6n);
    assert.equal(await runResumableFold(run.fold), 4);
  });
});
