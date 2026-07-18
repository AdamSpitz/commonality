import type { IpfsCidV1 } from '../../utils/cid-types.js';
import type { MutableRef, RefUpdate } from './types.js';
import type { RefUpdatedEvent } from './events.js';

/**
 * Fold RefUpdated events → current MutableRef state.
 * Last-write-wins: returns the latest event's value.
 * Returns null if the events array is empty.
 *
 * Caller is responsible for filtering events to a single (owner, name) pair
 * before calling this function.
 */
export function foldMutableRef(events: RefUpdatedEvent[]): MutableRef | null {
  if (events.length === 0) return null;
  const last = events[events.length - 1]!;
  return {
    owner: last.owner,
    name: last.name,
    value: last.currentRefValue,
    updatedAt: last.blockTimestamp.toString(),
    updatedAtBlock: last.blockNumber.toString(),
    transactionHash: last.transactionHash,
  };
}

/**
 * Fold RefUpdated events → full update history.
 * Each event becomes a RefUpdate record.
 * ID format: ${owner}:${name}:${blockNumber}:${logIndex}
 *
 * Caller is responsible for filtering events to a single (owner, name) pair
 * before calling this function.
 */
export function foldRefHistory(events: RefUpdatedEvent[]): RefUpdate[] {
  return events.slice().reverse().map(e => ({
    id: `${e.owner.toLowerCase()}:${e.name}:${e.blockNumber}:${e.logIndex}`,
    owner: e.owner,
    name: e.name,
    value: e.currentRefValue,
    blockNumber: e.blockNumber.toString(),
    timestamp: e.blockTimestamp.toString(),
    transactionHash: e.transactionHash,
    logIndex: e.logIndex,
  }));
}

function appendLegacyListValue(value: string, output: string[]): void {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      output.push(...parsed.filter((item): item is string => typeof item === 'string'));
      return;
    }
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { statements?: unknown }).statements)) {
      output.push(...(parsed as { statements: unknown[] }).statements.filter((item): item is string => typeof item === 'string'));
      return;
    }
  } catch {
    // Not JSON: in the append-event model the ref value itself is the appended item.
  }
  if (value) output.push(value);
}

/**
 * Fold a mutable-ref history into an append-only list.
 *
 * New list writes use one RefUpdated event per appended item (the event value is the item CID),
 * so the indexer/event cache reconstructs the list without fetching an IPFS JSON list. Legacy
 * JSON-list values are still accepted so old local/testnet histories remain readable.
 */
export function foldUserList(events: RefUpdatedEvent[], options: { deduplicate?: boolean } = {}): IpfsCidV1[] {
  const deduplicate = options.deduplicate ?? true;
  const values: string[] = [];
  for (const event of events) appendLegacyListValue(event.currentRefValue, values);

  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (deduplicate && seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result as IpfsCidV1[];
}
