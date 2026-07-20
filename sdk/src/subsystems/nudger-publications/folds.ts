import type {
  CuratedCollectionPublication,
  FoldedCuratedCollection,
  FoldedNudge,
  NudgeBatchPublication,
} from './types.js';

/**
 * Fold typed `nudge-batch` publications into the currently active per-pair nudges.
 *
 * Publications are applied in `publishedAt` order per the nudger spec. New nudges
 * overwrite earlier ones for the same `(nudger, target, suggested)` key until that
 * key is revoked. A revocation is a tombstone for that nudger/key: it removes any
 * currently active nudge and prevents stale or later batches from reactivating the
 * same pair. Reintroducing a semantically similar suggestion should use a new
 * suggested statement CID, not silently undo the revocation.
 */
export function foldNudgeBatchPublications(
  publications: NudgeBatchPublication[],
): FoldedNudge[] {
  const activeByKey = new Map<string, FoldedNudge>();
  const revokedKeys = new Set<string>();
  const sorted = [...publications].sort((a, b) => a.publishedAt - b.publishedAt);

  for (const publication of sorted) {
    const keyFor = (targetStatementCid: string, suggestedStatementCid: string) => [
      publication.nudger.toLowerCase(),
      targetStatementCid,
      suggestedStatementCid,
    ].join(':');

    for (const revocation of publication.revocations) {
      const key = keyFor(revocation.targetStatementCid, revocation.suggestedStatementCid);
      revokedKeys.add(key);
      activeByKey.delete(key);
    }

    for (const nudge of publication.nudges) {
      const key = keyFor(nudge.targetStatementCid, nudge.suggestedStatementCid);
      if (revokedKeys.has(key)) continue;
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
