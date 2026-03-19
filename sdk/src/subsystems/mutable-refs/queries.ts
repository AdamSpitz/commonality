/**
 * Mutable Refs queries — event cache + folds (no GraphQL)
 */

import {
  type MutableRef,
  type RefUpdate,
} from './types.js';
import type { RefUpdatedEvent } from './events.js';
import { SDKMachinery } from '../../machinery.js';
import { fetchRefUpdatedEvents, fetchAllRefUpdatedEvents } from '../../utils/eventCacheClient.js';
import { decodeMutableRefEvent } from '../../utils/eventDecoder.js';
import { foldMutableRef, foldRefHistory } from './folds.js';

function decodeRefUpdatedEvents(rawEvents: Awaited<ReturnType<typeof fetchRefUpdatedEvents>>): RefUpdatedEvent[] {
  const events: RefUpdatedEvent[] = [];
  for (const raw of rawEvents) {
    const decoded = decodeMutableRefEvent(raw);
    if (decoded) {
      events.push({
        contractAddress: decoded.contractAddress,
        owner: decoded.owner,
        name: decoded.refName,
        currentRefValue: decoded.currentRefValue,
        blockNumber: decoded.blockNumber,
        blockTimestamp: decoded.blockTimestamp,
        transactionHash: decoded.transactionHash,
        logIndex: decoded.logIndex,
      });
    }
  }
  return events.sort((a, b) => {
    const bn = Number(a.blockNumber - b.blockNumber);
    return bn !== 0 ? bn : a.logIndex - b.logIndex;
  });
}

// ============================================================================
// Mutable Refs Queries
// ============================================================================

/**
 * Get the current value of a user's ref
 */
export async function getUserRef(
  machinery: SDKMachinery,
  owner: string,
  name: string
): Promise<MutableRef | null> {
  const rawEvents = await fetchRefUpdatedEvents(machinery, owner);
  const events = decodeRefUpdatedEvents(rawEvents).filter(e => e.name === name);
  return foldMutableRef(events);
}

/**
 * Get all refs for a user
 */
export async function getUserRefs(
  machinery: SDKMachinery,
  owner: string
): Promise<MutableRef[]> {
  const rawEvents = await fetchRefUpdatedEvents(machinery, owner);
  const events = decodeRefUpdatedEvents(rawEvents);

  // Group by name, fold each to get current value
  const byName = new Map<string, RefUpdatedEvent[]>();
  for (const e of events) {
    const existing = byName.get(e.name) ?? [];
    existing.push(e);
    byName.set(e.name, existing);
  }

  const refs: MutableRef[] = [];
  for (const [, nameEvents] of byName) {
    const ref = foldMutableRef(nameEvents);
    if (ref) refs.push(ref);
  }
  return refs;
}

/**
 * Get the update history for a specific ref
 */
export async function getUserRefHistory(
  machinery: SDKMachinery,
  owner: string,
  name: string,
  limit: number = 100
): Promise<RefUpdate[]> {
  const rawEvents = await fetchRefUpdatedEvents(machinery, owner);
  const events = decodeRefUpdatedEvents(rawEvents).filter(e => e.name === name);
  return foldRefHistory(events).slice(0, limit);
}

/**
 * Get all ref updates across all users for a specific ref name
 */
export async function getRefsByName(
  machinery: SDKMachinery,
  name: string,
  limit: number = 100
): Promise<MutableRef[]> {
  const rawEvents = await fetchAllRefUpdatedEvents(machinery);
  const events = decodeRefUpdatedEvents(rawEvents).filter(e => e.name === name);

  // Group by owner, fold each to get current value
  const byOwner = new Map<string, RefUpdatedEvent[]>();
  for (const e of events) {
    const ownerKey = e.owner.toLowerCase();
    const existing = byOwner.get(ownerKey) ?? [];
    existing.push(e);
    byOwner.set(ownerKey, existing);
  }

  const refs: MutableRef[] = [];
  for (const [, ownerEvents] of byOwner) {
    const ref = foldMutableRef(ownerEvents);
    if (ref) refs.push(ref);
  }
  return refs.slice(0, limit);
}
