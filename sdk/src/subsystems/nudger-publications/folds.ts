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
