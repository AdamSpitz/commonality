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
export function foldImplications(events: ImplicationLifecycleEvent[]): Implication[] {
  const map = new Map<string, Implication>();
  const ordered = [...events].sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) return a.blockNumber < b.blockNumber ? -1 : 1;
    return a.logIndex - b.logIndex;
  });

  for (const e of ordered) {
    const key = `${e.attester.toLowerCase()}-${e.fromStatementCid}-${e.toStatementCid}`;
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
      existing.explanationCid = e.explanationCid as IpfsCidV1;
    }
  }

  return [...map.values()];
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
