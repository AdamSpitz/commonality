/**
 * Nudger-publication queries — event cache + folds.
 *
 * A "nudger" is an AI service that publishes guidance to IPFS and anchors it
 * on-chain via the NudgePublications contract: pairwise `nudge-batch`
 * publications (suggest related statements) and `curated-collection`
 * publications (organized statement lists for a stream). This subsystem reads
 * that output. It's a leaf — it depends only on shared utils and machinery, not
 * on the conceptspace substrate.
 */

import { fetchFromIPFS } from '../../utils/ipfs.js';
import { fetchEvents, padAddressAsTopic } from '../../utils/eventCacheClient.js';
import {
  decodeNudgesPublishedEvent,
  type DecodedNudgesPublishedEvent,
} from '../../utils/eventDecoder.js';
import { foldCuratedCollectionPublications, foldNudgeBatchPublications } from './folds.js';
import {
  type CuratedCollectionEntry,
  type CuratedCollectionPublication,
  type FoldedCuratedCollection,
  type FoldedNudge,
  type NudgerPublication,
  type NudgeBatchPublication,
} from './types.js';
import { IpfsCidV1 } from '../../utils/cid-types.js';
import { SDKMachinery } from '../../machinery.js';

function getNudgePublicationsContractAddress(machinery: SDKMachinery): `0x${string}` {
  const address = machinery.contractAddresses?.nudgePublications;
  if (!address) {
    throw new Error('contractAddresses.nudgePublications is required for nudger publication queries');
  }
  return address;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseNudgeBatchPublication(
  rawDocument: unknown,
  event: DecodedNudgesPublishedEvent,
): NudgeBatchPublication | null {
  if (!isRecord(rawDocument)) return null;
  const { kind, schemaVersion, nudger, publishedAt, nudges, revocations } = rawDocument;
  if (kind !== 'nudge-batch' || schemaVersion !== 1) return null;
  if (typeof nudger !== 'string' || nudger.toLowerCase() !== event.nudger.toLowerCase()) return null;
  if (typeof publishedAt !== 'number' || !Number.isFinite(publishedAt)) return null;
  if (!Array.isArray(nudges)) return null;

  const parsedNudges = nudges.flatMap((nudge): FoldedNudge[] | [] => {
    if (!isRecord(nudge)) return [];
    const { targetStatementCid, suggestedStatementCid, reason, confidence } = nudge;
    if (
      typeof targetStatementCid !== 'string' ||
      typeof suggestedStatementCid !== 'string' ||
      typeof reason !== 'string' ||
      typeof confidence !== 'number' ||
      !Number.isFinite(confidence)
    ) {
      return [];
    }
    return [{
      targetStatementCid: targetStatementCid as IpfsCidV1,
      suggestedStatementCid: suggestedStatementCid as IpfsCidV1,
      reason,
      confidence,
      nudger: event.nudger,
      publishedAt,
      publicationCid: event.publicationCid as IpfsCidV1,
    }];
  });

  if (parsedNudges.length !== nudges.length) return null;

  const parsedRevocations = (Array.isArray(revocations) ? revocations : []).flatMap((revocation): Array<{
    targetStatementCid: IpfsCidV1;
    suggestedStatementCid: IpfsCidV1;
  }> => {
    if (!isRecord(revocation)) return [];
    const { targetStatementCid, suggestedStatementCid } = revocation;
    if (typeof targetStatementCid !== 'string' || typeof suggestedStatementCid !== 'string') {
      return [];
    }
    return [{
      targetStatementCid: targetStatementCid as IpfsCidV1,
      suggestedStatementCid: suggestedStatementCid as IpfsCidV1,
    }];
  });

  if (Array.isArray(revocations) && parsedRevocations.length !== revocations.length) return null;

  return {
    kind: 'nudge-batch',
    schemaVersion: 1,
    nudger: event.nudger,
    publishedAt,
    publicationCid: event.publicationCid as IpfsCidV1,
    nudges: parsedNudges.map(({ nudger: _nudger, publishedAt: _publishedAt, publicationCid: _publicationCid, ...nudge }) => nudge),
    revocations: parsedRevocations,
  };
}

function parseCuratedCollectionEntries(entries: unknown): CuratedCollectionEntry[] | null {
  if (!Array.isArray(entries)) return null;

  const parsedEntries = entries.flatMap((entry): CuratedCollectionEntry[] | [] => {
    if (!isRecord(entry)) return [];
    const { cid, label, topicArea, parentCid } = entry;
    if (
      typeof cid !== 'string' ||
      typeof label !== 'string' ||
      typeof topicArea !== 'string' ||
      (parentCid !== undefined && typeof parentCid !== 'string')
    ) {
      return [];
    }
    return [{
      cid: cid as IpfsCidV1,
      label,
      topicArea,
      parentCid: parentCid as IpfsCidV1 | undefined,
    }];
  });

  return parsedEntries.length === entries.length ? parsedEntries : null;
}

function parseCuratedCollectionPublication(
  rawDocument: unknown,
  event: DecodedNudgesPublishedEvent,
): CuratedCollectionPublication | null {
  if (!isRecord(rawDocument)) return null;
  const { kind, schemaVersion, nudger, publishedAt, stream, entries } = rawDocument;
  if (kind !== 'curated-collection' || schemaVersion !== 1) return null;
  if (typeof nudger !== 'string' || nudger.toLowerCase() !== event.nudger.toLowerCase()) return null;
  if (typeof publishedAt !== 'number' || !Number.isFinite(publishedAt)) return null;
  if (typeof stream !== 'string') return null;

  const parsedEntries = parseCuratedCollectionEntries(entries);
  if (!parsedEntries) return null;

  return {
    kind: 'curated-collection',
    schemaVersion: 1,
    nudger: event.nudger,
    publishedAt,
    publicationCid: event.publicationCid as IpfsCidV1,
    stream,
    entries: parsedEntries,
  };
}

async function fetchTrustedNudgerPublicationEvents(
  machinery: SDKMachinery,
  trustedNudgers?: string[],
): Promise<DecodedNudgesPublishedEvent[]> {
  if (!trustedNudgers || trustedNudgers.length === 0) return [];

  const nudgePublications = getNudgePublicationsContractAddress(machinery);
  const rawEventGroups = await Promise.all(
    trustedNudgers.map((nudger) =>
      fetchEvents(machinery, {
        contractAddress: nudgePublications,
        eventName: 'NudgesPublished',
        topic1: padAddressAsTopic(nudger),
        limit: 10000,
      })
    )
  );

  return rawEventGroups
    .flat()
    .map((event) => decodeNudgesPublishedEvent(event))
    .filter((event): event is DecodedNudgesPublishedEvent => event !== null);
}

function sortPublicationsByPublishedAt<T extends { publishedAt: number; publicationCid: IpfsCidV1 }>(publications: T[]): T[] {
  return [...publications].sort((a, b) =>
    a.publishedAt - b.publishedAt || a.publicationCid.localeCompare(b.publicationCid)
  );
}

/**
 * Fetch typed nudger publications from trusted nudgers.
 */
export async function getNudgerPublications(
  machinery: SDKMachinery,
  trustedNudgers?: string[],
): Promise<NudgerPublication[]> {
  const publicationEvents = await fetchTrustedNudgerPublicationEvents(machinery, trustedNudgers);
  if (publicationEvents.length === 0) return [];

  const parsedPublications = await Promise.all(
    publicationEvents.map(async (event) => {
      const document = await fetchFromIPFS(machinery.ipfsConfig, event.publicationCid, 5000);
      if (document == null) return null;

      return parseNudgeBatchPublication(document, event)
        ?? parseCuratedCollectionPublication(document, event);
    })
  );

  return sortPublicationsByPublishedAt(
    parsedPublications.filter((publication): publication is NudgerPublication => publication !== null)
  );
}

/**
 * Fetch folded pairwise nudges for a specific target statement from trusted nudgers.
 */
export async function getStatementNudges(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  trustedNudgers?: string[],
): Promise<FoldedNudge[]> {
  const publications = await getNudgerPublications(machinery, trustedNudgers);
  const folded = foldNudgeBatchPublications(
    publications.filter((publication): publication is NudgeBatchPublication => publication.kind === 'nudge-batch')
  );

  return folded
    .filter((nudge) => nudge.targetStatementCid === statementCid)
    .sort((a, b) => b.confidence - a.confidence || b.publishedAt - a.publishedAt);
}

/**
 * Fetch the latest curated collections from trusted nudgers, optionally narrowed to one stream.
 */
export async function getCuratedCollections(
  machinery: SDKMachinery,
  trustedNudgers?: string[],
  stream?: string,
): Promise<FoldedCuratedCollection[]> {
  const publications = await getNudgerPublications(machinery, trustedNudgers);
  const folded = foldCuratedCollectionPublications(
    publications.filter((publication): publication is CuratedCollectionPublication => publication.kind === 'curated-collection')
  );

  return folded
    .filter((collection) => stream == null || collection.stream === stream)
    .sort((a, b) => b.publishedAt - a.publishedAt || a.stream.localeCompare(b.stream));
}
