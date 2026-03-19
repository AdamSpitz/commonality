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
