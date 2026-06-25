import { foldAllStatements, type DirectSupportEvent } from '@commonality/sdk/conceptspace';

export interface PopularStatement {
  cid: string;
  believerCount: number;
}

/**
 * Given decoded DirectSupport events, return the top N statements
 * sorted by believer count (descending), filtered by a minimum threshold.
 */
export function getTopStatements(
  events: DirectSupportEvent[],
  topN: number,
  minBelievers: number,
): PopularStatement[] {
  const counts = foldAllStatements(events);

  const statements: PopularStatement[] = [];
  for (const [cid, { believerCount }] of counts) {
    if (believerCount >= minBelievers) {
      statements.push({ cid, believerCount });
    }
  }

  statements.sort((a, b) => b.believerCount - a.believerCount);
  return statements.slice(0, topN);
}

/**
 * Extract the set of all unique statement CIDs from events.
 */
export function allStatementCids(events: DirectSupportEvent[]): Set<string> {
  const cids = new Set<string>();
  for (const e of events) {
    cids.add(e.statementId);
  }
  return cids;
}
