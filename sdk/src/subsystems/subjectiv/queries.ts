import { SDKMachinery } from '../../machinery.js';
import { fetchEvents, padAddressAsTopic } from '../../utils/eventCacheClient.js';
import { decodeTrustSetEvent } from '../../utils/eventDecoder.js';
import { foldDirectTrustMapping } from './folds.js';
import type {
  DirectTrustMapping,
  TransitiveTrustMapping,
  TrustComputationOptions,
} from './types.js';
import type { TrustSetEvent } from './events.js';

function decodeTrustSetEvents(
  rawEvents: Awaited<ReturnType<typeof fetchEvents>>
): TrustSetEvent[] {
  const events: TrustSetEvent[] = [];

  for (const rawEvent of rawEvents) {
    const decoded = decodeTrustSetEvent(rawEvent);
    if (decoded) {
      events.push({
        contractAddress: decoded.contractAddress,
        truster: decoded.truster,
        trustee: decoded.trustee,
        score: decoded.score,
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

/**
 * Get a user's direct trust mapping — all addresses they explicitly trust and the scores.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param trusterAddress - Ethereum address of the truster
 * @returns Map from trustee address (lowercased) to trust score (1–100)
 */
export async function getDirectTrustMapping(
  machinery: SDKMachinery,
  trusterAddress: string
): Promise<DirectTrustMapping> {
  const rawEvents = await fetchEvents(machinery, {
    eventName: 'TrustSet',
    topic1: padAddressAsTopic(trusterAddress),
    limit: 10000,
  });

  return foldDirectTrustMapping(decodeTrustSetEvents(rawEvents));
}

/**
 * Compute the transitive trust mapping for a user by traversing the trust graph.
 *
 * Uses BFS through the on-chain trust graph: if A trusts B at 80% and B trusts C
 * at 50%, A's transitive trust of C is (80 * 50) / 100 = 40%.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param trusterAddress - Ethereum address of the root truster
 * @param options - Computation options (maxHops, minScore, caching, progress)
 * @returns Map from address (lowercased) to cumulative transitive trust score
 */
export async function getTransitiveTrustMapping(
  machinery: SDKMachinery,
  trusterAddress: string,
  options: TrustComputationOptions = {}
): Promise<TransitiveTrustMapping> {
  return computeTransitiveTrustMapping(
    async (address) => getDirectTrustMapping(machinery, address),
    trusterAddress,
    options
  );
}

/**
 * Pure computation of transitive trust from any direct-trust data source.
 *
 * This is the underlying BFS algorithm used by {@link getTransitiveTrustMapping}.
 * Accepts a custom `getDirectTrust` function so it can be used with
 * mock data or alternative data sources.
 *
 * @param getDirectTrust - Async function that returns a user's direct trust mapping
 * @param trusterAddress - Ethereum address of the root truster
 * @param options - Computation options (maxHops, minScore, caching, progress)
 * @returns Map from address (lowercased) to cumulative transitive trust score
 */
export async function computeTransitiveTrustMapping(
  getDirectTrust: (address: string) => Promise<DirectTrustMapping>,
  trusterAddress: string,
  options: TrustComputationOptions = {}
): Promise<TransitiveTrustMapping> {
  const maxHops = options.maxHops ?? 6;
  const minScore = options.minScore ?? 1;
  const onProgress = options.onProgress;

  const directTrustCache = options.directTrustCache ?? new Map<string, DirectTrustMapping>();
  const bestScores: TransitiveTrustMapping = new Map();
  const queue: Array<{ address: string; score: number; hops: number }> = [];
  const rootAddress = trusterAddress.toLowerCase();
  let lastEmittedSize = -1;

  const emitProgress = (): void => {
    if (!onProgress || bestScores.size === lastEmittedSize) {
      return;
    }

    lastEmittedSize = bestScores.size;
    onProgress(new Map(bestScores));
  };

  const getCachedDirectTrust = async (address: string): Promise<DirectTrustMapping> => {
    const normalized = address.toLowerCase();
    const cached = directTrustCache.get(normalized);
    if (cached) return cached;

    const mapping = await getDirectTrust(normalized);
    directTrustCache.set(normalized, mapping);
    return mapping;
  };

  const rootDirectTrust = await getCachedDirectTrust(rootAddress);
  for (const [trustee, score] of rootDirectTrust.entries()) {
    if (score < minScore) continue;
    bestScores.set(trustee, score);
    queue.push({ address: trustee, score, hops: 1 });
  }
  emitProgress();

  while (queue.length > 0) {
    queue.sort((a, b) => b.score - a.score);
    const current = queue.shift()!;

    const bestKnownScore = bestScores.get(current.address) ?? 0;
    if (current.score < bestKnownScore || current.hops >= maxHops) {
      continue;
    }

    const directTrust = await getCachedDirectTrust(current.address);
    for (const [trustee, score] of directTrust.entries()) {
      if (trustee === rootAddress) continue;

      const cumulativeScore = (current.score * score) / 100;
      if (cumulativeScore < minScore) continue;

      const existing = bestScores.get(trustee) ?? 0;
      if (cumulativeScore > existing) {
        bestScores.set(trustee, cumulativeScore);
        queue.push({
          address: trustee,
          score: cumulativeScore,
          hops: current.hops + 1,
        });
      }
    }

    emitProgress();
  }

  return bestScores;
}

/**
 * Get the set of all addresses transitively trusted by a user.
 *
 * Convenience wrapper around {@link getTransitiveTrustMapping} that returns
 * just the set of addresses (discarding scores).
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param trusterAddress - Ethereum address of the root truster
 * @param options - Computation options (maxHops, minScore, caching, progress)
 * @returns Set of trusted addresses (lowercased)
 */
export async function getTrustedSet(
  machinery: SDKMachinery,
  trusterAddress: string,
  options: TrustComputationOptions = {}
): Promise<Set<string>> {
  const mapping = await getTransitiveTrustMapping(machinery, trusterAddress, options);
  return new Set(mapping.keys());
}
