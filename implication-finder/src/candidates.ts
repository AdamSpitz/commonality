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
 * Skips pairs already evaluated, self-pairs, and cross-domain pairs
 * (unless either statement's domain is unknown, in which case we allow it through).
 */
export function selectCandidatePairs(
  newStatementCids: Set<string>,
  popularStatements: PopularStatement[],
  alreadyEvaluated: Set<string>,
  domainMap: Map<string, string>,
  maxPairs = Number.POSITIVE_INFINITY,
): CandidatePair[] {
  const pairs: CandidatePair[] = [];
  if (maxPairs <= 0) return pairs;

  const addPair = (pair: CandidatePair): boolean => {
    pairs.push(pair);
    return pairs.length >= maxPairs;
  };

  for (const newCid of newStatementCids) {
    for (const popular of popularStatements) {
      if (newCid === popular.cid) continue;

      const newDomain = domainMap.get(newCid);
      const popularDomain = domainMap.get(popular.cid);

      // If both domains are known and differ, skip this pair.
      // If either domain is unknown, allow the pair through (the attester
      // will still evaluate it; we just can't filter it confidently).
      if (newDomain !== undefined && popularDomain !== undefined && newDomain !== popularDomain) {
        continue;
      }

      // new → popular
      const key1 = pairKey(newCid, popular.cid);
      if (!alreadyEvaluated.has(key1)) {
        if (addPair({ fromCid: newCid, toCid: popular.cid })) return pairs;
      }

      // popular → new
      const key2 = pairKey(popular.cid, newCid);
      if (!alreadyEvaluated.has(key2)) {
        if (addPair({ fromCid: popular.cid, toCid: newCid })) return pairs;
      }
    }
  }

  return pairs;
}
