import type {
  CuratedCollectionPublication,
  FoldedCuratedCollection,
  FoldedNudge,
  Implication,
  NudgeBatchPublication,
  UserBelief,
} from './types.js';
import type { DirectSupportEvent, ImplicationAttestationEvent } from './events.js';
import type { IpfsCidV1 } from '../../utils/cid-types.js';

/**
 * Fold DirectSupport events for a single statement → belief state.
 * Tracks per-user belief; handles state transitions (believe → disbelieve, etc.).
 * believerCount and disbelieverCount reflect current belief states (noOpinion excluded).
 *
 * Caller is responsible for filtering events to a single statementId
 * before calling this function.
 */
export function foldStatementBeliefs(events: DirectSupportEvent[]): {
  believerCount: number;
  disbelieverCount: number;
  beliefs: Map<string, number>;  // user address (lowercased) → beliefState
} {
  const beliefs = new Map<string, number>();

  for (const e of events) {
    beliefs.set(e.user.toLowerCase(), e.beliefState);
  }

  let believerCount = 0;
  let disbelieverCount = 0;
  for (const state of beliefs.values()) {
    if (state === 1) believerCount++;
    else if (state === 2) disbelieverCount++;
  }

  return { believerCount, disbelieverCount, beliefs };
}

/**
 * Fold DirectSupport events for a single user → their beliefs across statements.
 * Uses last-write-wins per statementId. Returns all beliefs (including noOpinion=0).
 *
 * Caller is responsible for filtering events to a single user address
 * before calling this function.
 */
export function foldUserBeliefs(events: DirectSupportEvent[]): UserBelief[] {
  const latestByStatement = new Map<string, number>();

  for (const e of events) {
    latestByStatement.set(e.statementId, e.beliefState);
  }

  const result: UserBelief[] = [];
  for (const [statementCid, beliefState] of latestByStatement.entries()) {
    result.push({ statementCid: statementCid as IpfsCidV1, beliefState });
  }
  return result;
}

/**
 * Fold ImplicationAttestation events → implication records.
 * Key = (attester, fromStatementCid, toStatementCid).
 * Re-attestation updates explanationCid; createdAt and blockNumber are set from the first event.
 *
 * Caller may pass all implication events; deduplication is handled internally.
 */
export function foldImplications(events: ImplicationAttestationEvent[]): Implication[] {
  const map = new Map<string, Implication>();

  for (const e of events) {
    const key = `${e.attester.toLowerCase()}-${e.fromStatementCid}-${e.toStatementCid}`;
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
 * Handles state transitions: each (user, statementId) pair keeps only the latest beliefState.
 *
 * Used for "browse statements sorted by believer count" — processes events across all users
 * and statements at once.
 */
export function foldAllStatements(
  events: DirectSupportEvent[],
): Map<string, { believerCount: number; disbelieverCount: number }> {
  // Track latest beliefState per (user, statementId)
  const userStatementState = new Map<string, number>();  // key = user:statementId → beliefState

  for (const e of events) {
    const key = `${e.user.toLowerCase()}:${e.statementId}`;
    userStatementState.set(key, e.beliefState);
  }

  // Aggregate counts per statement
  const statementCounts = new Map<string, { believerCount: number; disbelieverCount: number }>();

  for (const [key, beliefState] of userStatementState.entries()) {
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

/**
 * Fold typed `nudge-batch` publications into the currently active per-pair nudges.
 *
 * Publications are applied in `publishedAt` order per the nudger spec. New nudges
 * overwrite earlier ones for the same `(nudger, target, suggested)` key, and
 * revocations remove previously active nudges for that same key.
 */
export function foldNudgeBatchPublications(
  publications: NudgeBatchPublication[],
): FoldedNudge[] {
  const activeByKey = new Map<string, FoldedNudge>();
  const sorted = [...publications].sort((a, b) => a.publishedAt - b.publishedAt);

  for (const publication of sorted) {
    for (const revocation of publication.revocations) {
      const key = [
        publication.nudger.toLowerCase(),
        revocation.targetStatementCid,
        revocation.suggestedStatementCid,
      ].join(':');
      activeByKey.delete(key);
    }

    for (const nudge of publication.nudges) {
      const key = [
        publication.nudger.toLowerCase(),
        nudge.targetStatementCid,
        nudge.suggestedStatementCid,
      ].join(':');
      activeByKey.set(key, {
        ...nudge,
        nudger: publication.nudger,
        publishedAt: publication.publishedAt,
        publicationCid: publication.publicationCid,
      });
    }
  }

  return [...activeByKey.values()];
}

/**
 * Fold `curated-collection` publications into the latest snapshot per `(nudger, stream)`.
 */
export function foldCuratedCollectionPublications(
  publications: CuratedCollectionPublication[],
): FoldedCuratedCollection[] {
  const latestByStream = new Map<string, FoldedCuratedCollection>();
  const sorted = [...publications].sort((a, b) => a.publishedAt - b.publishedAt);

  for (const publication of sorted) {
    const key = `${publication.nudger.toLowerCase()}:${publication.stream}`;
    latestByStream.set(key, {
      nudger: publication.nudger,
      stream: publication.stream,
      publishedAt: publication.publishedAt,
      publicationCid: publication.publicationCid,
      entries: publication.entries,
    });
  }

  return [...latestByStream.values()];
}
