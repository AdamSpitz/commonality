/**
 * Resume a fold from a stored accumulator.
 *
 * Finalized events are folded into the record that gets saved. Events after
 * `finalizedThrough` are folded into a copy that is not saved, so a reorg in
 * the tail cannot corrupt the stored accumulator.
 */

export interface FoldCursor {
  blockNumber: string;
  logIndex: number;
}

export interface StoredFold {
  version: number;
  cursor: FoldCursor | null;
  accumulator: unknown;
}

export interface FoldStore {
  get(key: string): Promise<StoredFold | null>;
  put(key: string, record: StoredFold): Promise<void>;
}

export class MemoryFoldStore implements FoldStore {
  private readonly records = new Map<string, StoredFold>();

  async get(key: string): Promise<StoredFold | null> {
    return this.records.get(key) ?? null;
  }

  async put(key: string, record: StoredFold): Promise<void> {
    this.records.set(key, structuredClone(record));
  }
}

/** Process-wide store used when a caller does not pass one. */
export const defaultFoldStore = new MemoryFoldStore();

export function foldStoreKey(parts: {
  chainId: number | string;
  eventCacheUrl: string;
  contracts: string[];
  id: string;
  version: number;
}): string {
  return [
    'fold',
    String(parts.chainId),
    parts.eventCacheUrl,
    parts.contracts.map(contract => contract.toLowerCase()).sort().join(','),
    parts.id,
    String(parts.version),
  ].join('::');
}

export function isAtOrBeforeCursor(event: FoldCursor, cursor: FoldCursor): boolean {
  const eventBlock = BigInt(event.blockNumber);
  const cursorBlock = BigInt(cursor.blockNumber);
  if (eventBlock < cursorBlock) return true;
  if (eventBlock > cursorBlock) return false;
  return event.logIndex <= cursor.logIndex;
}

export interface ResumableFold<TEvent, TAcc, TResult> {
  id: string;
  version: number;
  key: string;
  store?: FoldStore;
  empty: () => TAcc;
  fetch: (cursor: FoldCursor | null) => Promise<{ events: TEvent[]; finalizedThrough: bigint | null }>;
  position: (event: TEvent) => FoldCursor;
  step: (accumulator: TAcc, events: TEvent[]) => TAcc;
  serialize: (accumulator: TAcc) => unknown;
  deserialize: (raw: unknown) => TAcc;
  finish: (accumulator: TAcc) => TResult;
}

function compareCursors(a: FoldCursor, b: FoldCursor): number {
  const delta = BigInt(a.blockNumber) - BigInt(b.blockNumber);
  if (delta !== 0n) return delta < 0n ? -1 : 1;
  return a.logIndex - b.logIndex;
}

export async function runResumableFold<TEvent, TAcc, TResult>(
  fold: ResumableFold<TEvent, TAcc, TResult>,
): Promise<TResult> {
  const store = fold.store ?? defaultFoldStore;
  const stored = await store.get(fold.key);
  let accumulator = fold.empty();
  let cursor: FoldCursor | null = null;
  if (stored?.version === fold.version) {
    try {
      accumulator = fold.deserialize(stored.accumulator);
      cursor = stored.cursor;
    } catch {
      accumulator = fold.empty();
      cursor = null;
    }
  }

  const { events, finalizedThrough } = await fold.fetch(cursor);
  const fresh = (cursor == null ? events : events.filter(event => !isAtOrBeforeCursor(fold.position(event), cursor)))
    .slice()
    .sort((left, right) => compareCursors(fold.position(left), fold.position(right)));

  const finalized: TEvent[] = [];
  const tail: TEvent[] = [];
  for (const event of fresh) {
    const block = BigInt(fold.position(event).blockNumber);
    if (finalizedThrough != null && block <= finalizedThrough) finalized.push(event);
    else tail.push(event);
  }

  if (finalized.length > 0) {
    accumulator = fold.step(accumulator, finalized);
    await store.put(fold.key, {
      version: fold.version,
      cursor: fold.position(finalized[finalized.length - 1]!),
      accumulator: fold.serialize(accumulator),
    });
  }

  const viewBase = fold.deserialize(fold.serialize(accumulator));
  const view = tail.length > 0 ? fold.step(viewBase, tail) : viewBase;
  return fold.finish(view);
}
