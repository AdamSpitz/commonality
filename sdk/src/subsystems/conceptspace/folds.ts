import type {
  Implication,
  UserBelief,
} from './types.js';
import type { DirectSupportEvent, ImplicationLifecycleEvent } from './events.js';
import type { IpfsCidV1 } from '../../utils/cid-types.js';

/**
 * True if `candidate` is strictly later than `current` in chain order.
 * The event-cache API does not guarantee order, so folds must not rely on
 * array position for last-write-wins.
 */
function isLaterEvent(
  candidate: { blockNumber: bigint; logIndex: number },
  current: { blockNumber: bigint; logIndex: number },
): boolean {
  if (candidate.blockNumber !== current.blockNumber) {
    return candidate.blockNumber > current.blockNumber;
  }
  return candidate.logIndex > current.logIndex;
}

/**
 * Fold DirectSupport events for a single statement → belief state.
 * Tracks per-user belief; handles state transitions (believe → disbelieve, etc.).
 * believerCount and disbelieverCount reflect current belief states (noOpinion excluded).
 *
 * Caller is responsible for filtering events to a single statementId
 * before calling this function.
 *
 * Latest belief per user is chosen by (blockNumber, logIndex), not array order —
 * the event cache may return events in any order.
 */
export function foldStatementBeliefs(events: DirectSupportEvent[]): {
  believerCount: number;
  disbelieverCount: number;
  beliefs: Map<string, number>;  // user address (lowercased) → beliefState
} {
  const latest = new Map<string, { beliefState: number; blockNumber: bigint; logIndex: number }>();

  for (const e of events) {
    const key = e.user.toLowerCase();
    const prev = latest.get(key);
    if (!prev || isLaterEvent(e, prev)) {
      latest.set(key, {
        beliefState: e.beliefState,
        blockNumber: e.blockNumber,
        logIndex: e.logIndex,
      });
    }
  }

  const beliefs = new Map<string, number>();
  let believerCount = 0;
  let disbelieverCount = 0;
  for (const [user, { beliefState }] of latest.entries()) {
    beliefs.set(user, beliefState);
    if (beliefState === 1) believerCount++;
    else if (beliefState === 2) disbelieverCount++;
  }

  return { believerCount, disbelieverCount, beliefs };
}

/**
 * Fold DirectSupport events for a single user → their beliefs across statements.
 * Uses last-write-wins per statementId by (blockNumber, logIndex). Returns all
 * beliefs (including noOpinion=0).
 *
 * Caller is responsible for filtering events to a single user address
 * before calling this function.
 */
export function foldUserBeliefs(events: DirectSupportEvent[]): UserBelief[] {
  const latestByStatement = new Map<string, { beliefState: number; blockNumber: bigint; logIndex: number }>();

  for (const e of events) {
    const prev = latestByStatement.get(e.statementId);
    if (!prev || isLaterEvent(e, prev)) {
      latestByStatement.set(e.statementId, {
        beliefState: e.beliefState,
        blockNumber: e.blockNumber,
        logIndex: e.logIndex,
      });
    }
  }

  const result: UserBelief[] = [];
  for (const [statementCid, { beliefState }] of latestByStatement.entries()) {
    result.push({ statementCid: statementCid as IpfsCidV1, beliefState });
  }
  return result;
}

/**
 * Fold implication attestations and revocations → active implication records.
 * Key = (attester, fromStatementCid, toStatementCid). Events are applied in
 * chain order, regardless of event-cache response order. Re-attestation after
 * a revocation starts a new active record.
 */
function implicationKey(event: ImplicationLifecycleEvent): string {
  return `${event.attester.toLowerCase()}-${event.fromStatementCid}-${event.toStatementCid}`;
}

/** Bump when {@link stepImplications} changes the stored accumulator. */
export const IMPLICATION_FOLD_VERSION = 1;

export function emptyImplications(): Map<string, Implication> {
  return new Map();
}

/** Apply implication events onto a copy of the active-edge map. */
export function stepImplications(
  accumulator: Map<string, Implication>,
  events: ImplicationLifecycleEvent[],
): Map<string, Implication> {
  const map = new Map(accumulator);
  const ordered = [...events].sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) return a.blockNumber < b.blockNumber ? -1 : 1;
    return a.logIndex - b.logIndex;
  });

  for (const e of ordered) {
    const key = implicationKey(e);
    if (!('explanationCid' in e)) {
      map.delete(key);
      continue;
    }

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        attester: e.attester,
        fromStatementCid: e.fromStatementCid as IpfsCidV1,
        toStatementCid: e.toStatementCid as IpfsCidV1,
        explanationCid: e.explanationCid as IpfsCidV1,
        createdAt: e.blockTimestamp.toString(),
        blockNumber: e.blockNumber.toString(),
      });
    } else {
      map.set(key, { ...existing, explanationCid: e.explanationCid as IpfsCidV1 });
    }
  }

  return map;
}

export function serializeImplications(accumulator: Map<string, Implication>): unknown {
  return [...accumulator.entries()];
}

export function deserializeImplications(raw: unknown): Map<string, Implication> {
  if (!Array.isArray(raw)) return emptyImplications();
  return new Map(raw as Array<[string, Implication]>);
}

export function foldImplications(events: ImplicationLifecycleEvent[]): Implication[] {
  return [...stepImplications(emptyImplications(), events).values()];
}

/**
 * Fold all DirectSupport events → believer/disbeliever counts per statement.
 * Handles state transitions: each (user, statementId) pair keeps only the latest
 * beliefState by (blockNumber, logIndex) — not array order.
 *
 * Used for "browse statements sorted by believer count" — processes events across all users
 * and statements at once.
 */
export function foldAllStatements(
  events: DirectSupportEvent[],
): Map<string, { believerCount: number; disbelieverCount: number }> {
  // Track latest beliefState per (user, statementId)
  const userStatementState = new Map<
    string,
    { beliefState: number; blockNumber: bigint; logIndex: number }
  >();  // key = user:statementId

  for (const e of events) {
    const key = `${e.user.toLowerCase()}:${e.statementId}`;
    const prev = userStatementState.get(key);
    if (!prev || isLaterEvent(e, prev)) {
      userStatementState.set(key, {
        beliefState: e.beliefState,
        blockNumber: e.blockNumber,
        logIndex: e.logIndex,
      });
    }
  }

  // Aggregate counts per statement
  const statementCounts = new Map<string, { believerCount: number; disbelieverCount: number }>();

  for (const [key, { beliefState }] of userStatementState.entries()) {
    const statementId = key.slice(key.indexOf(':') + 1);
    let counts = statementCounts.get(statementId);
    if (!counts) {
      counts = { believerCount: 0, disbelieverCount: 0 };
      statementCounts.set(statementId, counts);
    }
    if (beliefState === 1) counts.believerCount++;
    else if (beliefState === 2) counts.disbelieverCount++;
  }

  return statementCounts;
}

/** Bump when {@link stepDirectSupportBrowse} changes the stored accumulator. */
export const DIRECT_SUPPORT_BROWSE_FOLD_VERSION = 1;

export interface DirectSupportBrowseState {
  latest: Map<string, { beliefState: number; blockNumber: bigint; logIndex: number }>;
  firstSeen: Map<string, { blockTimestamp: bigint; blockNumber: bigint }>;
  publishers: Map<string, string[]>;
}

export function emptyDirectSupportBrowse(): DirectSupportBrowseState {
  return { latest: new Map(), firstSeen: new Map(), publishers: new Map() };
}

/**
 * Apply DirectSupport events onto a browse accumulator.
 *
 * Counts come from the latest belief per user and statement. First-seen is the
 * earliest `(blockTimestamp, blockNumber)`. Publishers keep first-seen order
 * and drop later duplicates of the same address.
 */
export function stepDirectSupportBrowse(
  state: DirectSupportBrowseState,
  events: readonly DirectSupportEvent[],
): DirectSupportBrowseState {
  const latest = new Map(state.latest);
  const firstSeen = new Map(state.firstSeen);
  const publishers = new Map(Array.from(state.publishers, ([id, users]) => [id, [...users]]));

  for (const event of events) {
    const user = event.user.toLowerCase();
    const key = `${user}:${event.statementId}`;
    const prev = latest.get(key);
    if (!prev || isLaterEvent(event, prev)) {
      latest.set(key, {
        beliefState: event.beliefState,
        blockNumber: event.blockNumber,
        logIndex: event.logIndex,
      });
    }

    const seen = firstSeen.get(event.statementId);
    if (
      !seen
      || event.blockTimestamp < seen.blockTimestamp
      || (event.blockTimestamp === seen.blockTimestamp && event.blockNumber < seen.blockNumber)
    ) {
      firstSeen.set(event.statementId, {
        blockTimestamp: event.blockTimestamp,
        blockNumber: event.blockNumber,
      });
    }

    const known = publishers.get(event.statementId) ?? [];
    if (!known.some(address => address.toLowerCase() === user)) {
      publishers.set(event.statementId, [...known, event.user]);
    }
  }

  return { latest, firstSeen, publishers };
}

export function browseCountsFromState(
  state: DirectSupportBrowseState,
): Map<string, { believerCount: number; disbelieverCount: number }> {
  const statementCounts = new Map<string, { believerCount: number; disbelieverCount: number }>();
  for (const [key, { beliefState }] of state.latest) {
    const statementId = key.slice(key.indexOf(':') + 1);
    let counts = statementCounts.get(statementId);
    if (!counts) {
      counts = { believerCount: 0, disbelieverCount: 0 };
      statementCounts.set(statementId, counts);
    }
    if (beliefState === 1) counts.believerCount++;
    else if (beliefState === 2) counts.disbelieverCount++;
  }
  return statementCounts;
}

export function serializeDirectSupportBrowse(state: DirectSupportBrowseState): unknown {
  return {
    foldVersion: DIRECT_SUPPORT_BROWSE_FOLD_VERSION,
    latest: [...state.latest].map(([key, value]) => ({
      key,
      beliefState: value.beliefState,
      blockNumber: value.blockNumber.toString(),
      logIndex: value.logIndex,
    })),
    firstSeen: [...state.firstSeen].map(([statementId, value]) => ({
      statementId,
      blockTimestamp: value.blockTimestamp.toString(),
      blockNumber: value.blockNumber.toString(),
    })),
    publishers: [...state.publishers].map(([statementId, users]) => ({ statementId, users })),
  };
}

export function deserializeDirectSupportBrowse(raw: unknown): DirectSupportBrowseState {
  const record = raw as {
    latest?: Array<{ key: string; beliefState: number; blockNumber: string; logIndex: number }>;
    firstSeen?: Array<{ statementId: string; blockTimestamp: string; blockNumber: string }>;
    publishers?: Array<{ statementId: string; users: string[] }>;
  };
  return {
    latest: new Map((record.latest ?? []).map(entry => [entry.key, {
      beliefState: entry.beliefState,
      blockNumber: BigInt(entry.blockNumber),
      logIndex: entry.logIndex,
    }])),
    firstSeen: new Map((record.firstSeen ?? []).map(entry => [entry.statementId, {
      blockTimestamp: BigInt(entry.blockTimestamp),
      blockNumber: BigInt(entry.blockNumber),
    }])),
    publishers: new Map((record.publishers ?? []).map(entry => [entry.statementId, [...entry.users]])),
  };
}
