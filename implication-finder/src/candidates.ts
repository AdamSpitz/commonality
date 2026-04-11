import type { PopularStatement } from './popularity.js';
import { pairKey } from './state.js';

export interface CandidatePair {
  fromCid: string;
  toCid: string;
}

/**
 * For each new statement, generate candidate pairs with popular statements.
 *
 * We check both directions:
 *   - new → popular  ("does believing the new statement imply the popular one?")
 *   - popular → new  ("does believing the popular statement imply the new one?")
 *
 * Skips pairs already evaluated and self-pairs.
 */
export function selectCandidatePairs(
  newStatementCids: Set<string>,
  popularStatements: PopularStatement[],
  alreadyEvaluated: Set<string>,
): CandidatePair[] {
  const pairs: CandidatePair[] = [];

  for (const newCid of newStatementCids) {
    for (const popular of popularStatements) {
      if (newCid === popular.cid) continue;

      // new → popular
      const key1 = pairKey(newCid, popular.cid);
      if (!alreadyEvaluated.has(key1)) {
        pairs.push({ fromCid: newCid, toCid: popular.cid });
      }

      // popular → new
      const key2 = pairKey(popular.cid, newCid);
      if (!alreadyEvaluated.has(key2)) {
        pairs.push({ fromCid: popular.cid, toCid: newCid });
      }
    }
  }

  return pairs;
}
