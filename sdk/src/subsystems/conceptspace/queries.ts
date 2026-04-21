/**
 * Conceptspace queries — event cache + folds (no GraphQL)
 */

import { fetchFromIPFS } from '../../utils/ipfs.js';
import { fetchEvents, padAddressAsTopic } from '../../utils/eventCacheClient.js';
import {
  decodeDirectSupportEvent,
  decodeImplicationAttestationEvent,
  decodeNudgesPublishedEvent,
  type DecodedDirectSupportEvent,
  type DecodedImplicationAttestationEvent,
  type DecodedNudgesPublishedEvent,
} from '../../utils/eventDecoder.js';
import {
  foldStatementBeliefs,
  foldUserBeliefs,
  foldAllStatements,
  foldCuratedCollectionPublications,
  foldImplications,
  foldNudgeBatchPublications,
} from './folds.js';
import {
  type CuratedCollectionEntry,
  type CuratedCollectionPublication,
  type FoldedCuratedCollection,
  type FoldedNudge,
  type Implication,
  type NudgerPublication,
  type NudgeBatchPublication,
  type Statement,
  type UserBelief,
  type IndirectSupporter,
  type StatementListItem,
  type BrowseStatementsOptions,
  type StatementWithContent,
  type GetStatementWithContentOptions,
  type IndirectSupportInfo,
  type GetUserIndirectSupportOptions,
  type UserSocialData,
  type HighProfileSigner,
} from './types.js';
import { type DisplayableDocument } from '../displayable-documents/displayable-document.js';
import { IpfsCidV1, normalizeCidV1, cidToBytes32 } from '../../utils/cid-types.js';
import { fetchAddressSocialData, fetchFollowerCountForTwitterHandle } from '../../utils/twitter.js';
import { SDKMachinery } from '../../machinery.js';
import { fetchAndFoldContentFundingState, getOwnerForCanonicalChannelId } from '../content-funding/queries.js';

// ============================================================================
// Type Definitions
// ============================================================================

/** A suggested related statement, with the reason for the suggestion. */
export interface StatementSuggestion {
  /** The suggested statement. */
  statement: StatementListItem;
  /** Human-readable explanation of why this statement is suggested. */
  reason: string;
  /** Type of relationship (e.g. `'implies'`, `'impliedBy'`). */
  relationshipType: string;
}

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


// ============================================================================
// Conceptspace Queries (Event Cache + Folds)
// ============================================================================

/**
 * Get a statement's on-chain metadata by its CID.
 *
 * Fetches DirectSupport events for the statement and folds them to compute
 * believer/disbeliever counts and creation timestamp.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param statementCid - CIDv1 of the statement
 * @returns Statement metadata, or null if no events exist for this CID
 */
export async function getStatement(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1
): Promise<Statement | null> {
  const contracts = machinery.contractAddresses!;

  const events = await fetchEvents(machinery, {
    contractAddress: contracts.beliefs,
    eventName: 'DirectSupport',
    topic2: cidToBytes32(statementCid),
    limit: 10000,
  });

  const decodedEvents: DecodedDirectSupportEvent[] = [];
  for (const event of events) {
    const decoded = decodeDirectSupportEvent(event);
    if (decoded) {
      decodedEvents.push(decoded);
    }
  }

  const folded = foldStatementBeliefs(decodedEvents);

  if (decodedEvents.length === 0) {
    return null;
  }

  const earliestEvent = decodedEvents.reduce((min, e) => e.blockNumber < min.blockNumber ? e : min);

  return {
    id: statementCid,
    cid: statementCid,
    believerCount: folded.believerCount,
    disbelieverCount: folded.disbelieverCount,
    createdAt: new Date(Number(earliestEvent.blockTimestamp) * 1000).toISOString(),
  };
}

/**
 * Get a user's current belief state for a specific statement.
 *
 * Returns the latest belief state: 0 = no opinion, 1 = believes, 2 = disbelieves.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param userAddress - Ethereum address of the user
 * @param statementCid - CIDv1 of the statement
 * @returns User's belief (beliefState 0 if no events found), or null on error
 */
export async function getUserBelief(
  machinery: SDKMachinery,
  userAddress: string,
  statementCid: IpfsCidV1
): Promise<UserBelief | null> {
  const contracts = machinery.contractAddresses!;

  const events = await fetchEvents(machinery, {
    contractAddress: contracts.beliefs,
    eventName: 'DirectSupport',
    topic2: cidToBytes32(statementCid),
    limit: 10000,
  });

  const decodedEvents: DecodedDirectSupportEvent[] = [];
  for (const event of events) {
    const decoded = decodeDirectSupportEvent(event);
    if (decoded) {
      decodedEvents.push(decoded);
    }
  }

  const userAddressLower = userAddress.toLowerCase();
  const userEvents = decodedEvents.filter(e => e.user.toLowerCase() === userAddressLower);

  if (userEvents.length === 0) {
    return { statementCid, beliefState: 0 };
  }

  const latestEvent = userEvents.sort((a, b) => Number(b.blockNumber - a.blockNumber))[0];
  return {
    statementCid,
    beliefState: latestEvent.beliefState,
  };
}

// ============================================================================
// Implications Queries (Event Cache + Folds)
// ============================================================================

/**
 * Filter implications to only those from trusted attesters.
 * If trustedAttesters is undefined or empty, returns all implications unfiltered.
 */
function filterByTrustedAttesters(
  implications: Implication[],
  trustedAttesters?: string[]
): Implication[] {
  if (!trustedAttesters || trustedAttesters.length === 0) return implications;
  const lowerAttesters = trustedAttesters.map(a => a.toLowerCase());
  return implications.filter(i => lowerAttesters.includes(i.attester.toLowerCase()));
}

/**
 * Get all implications originating from a statement (what it implies).
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param statementCid - CIDv1 of the source statement
 * @param trustedAttesters - Optional list of attester addresses to filter by
 * @returns Array of implications where this statement is the "from" side
 */
export async function getImplicationsFrom(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  trustedAttesters?: string[]
): Promise<Implication[]> {
  const contracts = machinery.contractAddresses!;

  const events = await fetchEvents(machinery, {
    contractAddress: contracts.implications,
    eventName: 'ImplicationAttestation',
    topic2: cidToBytes32(statementCid),
    limit: 10000,
  });

  const decodedEvents: DecodedImplicationAttestationEvent[] = [];
  for (const event of events) {
    const decoded = decodeImplicationAttestationEvent(event);
    if (decoded) {
      decodedEvents.push(decoded);
    }
  }

  return filterByTrustedAttesters(foldImplications(decodedEvents), trustedAttesters);
}

/**
 * Get all implications pointing to a statement (what implies it).
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param statementCid - CIDv1 of the target statement
 * @param trustedAttesters - Optional list of attester addresses to filter by
 * @returns Array of implications where this statement is the "to" side
 */
export async function getImplicationsTo(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  trustedAttesters?: string[]
): Promise<Implication[]> {
  const contracts = machinery.contractAddresses!;

  const events = await fetchEvents(machinery, {
    contractAddress: contracts.implications,
    eventName: 'ImplicationAttestation',
    topic3: cidToBytes32(statementCid),
    limit: 10000,
  });

  const decodedEvents: DecodedImplicationAttestationEvent[] = [];
  for (const event of events) {
    const decoded = decodeImplicationAttestationEvent(event);
    if (decoded) {
      decodedEvents.push(decoded);
    }
  }

  return filterByTrustedAttesters(foldImplications(decodedEvents), trustedAttesters);
}

/**
 * Get a specific implication attestation by attester and statement pair.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param attesterAddress - Ethereum address of the attester
 * @param fromStatementCid - CIDv1 of the source statement
 * @param toStatementCid - CIDv1 of the target statement
 * @returns The implication attestation, or null if not found
 */
export async function getImplication(
  machinery: SDKMachinery,
  attesterAddress: string,
  fromStatementCid: IpfsCidV1,
  toStatementCid: IpfsCidV1
): Promise<Implication | null> {
  const contracts = machinery.contractAddresses!;

  const events = await fetchEvents(machinery, {
    contractAddress: contracts.implications,
    eventName: 'ImplicationAttestation',
    topic2: cidToBytes32(fromStatementCid),
    topic3: cidToBytes32(toStatementCid),
    limit: 1000,
  });

  const decodedEvents: DecodedImplicationAttestationEvent[] = [];
  for (const event of events) {
    const decoded = decodeImplicationAttestationEvent(event);
    if (decoded) {
      decodedEvents.push(decoded);
    }
  }

  const attesterLower = attesterAddress.toLowerCase();
  const matching = decodedEvents.filter(e => e.attester.toLowerCase() === attesterLower);

  if (matching.length === 0) {
    return null;
  }

  const latest = matching.sort((a, b) => Number(b.blockNumber - a.blockNumber))[0];
  return {
    attester: latest.attester,
    fromStatementCid: latest.fromStatementCid as IpfsCidV1,
    toStatementCid: latest.toStatementCid as IpfsCidV1,
    explanationCid: latest.explanationCid as IpfsCidV1,
    createdAt: new Date(Number(latest.blockTimestamp) * 1000).toISOString(),
    blockNumber: latest.blockNumber.toString(),
  };
}

// ============================================================================
// Indirect Support Computation Queries
// ============================================================================

/**
 * Compute indirect supporters for a statement.
 *
 * An indirect supporter is a user who believes a statement that implies this one
 * (via the implication graph) but has not directly expressed a belief on this statement.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param statementCid - CIDv1 of the target statement
 * @param trustedAttesters - Optional list of attester addresses to filter implications by
 * @returns Array of indirect supporters with the "via" statement they believe
 */
export async function getIndirectSupporters(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  trustedAttesters?: string[]
): Promise<IndirectSupporter[]> {
  const contracts = machinery.contractAddresses!;

  const toEvents = await fetchEvents(machinery, {
    contractAddress: contracts.implications,
    eventName: 'ImplicationAttestation',
    topic3: cidToBytes32(statementCid),
    limit: 10000,
  });

  const decodedToEvents: DecodedImplicationAttestationEvent[] = [];
  for (const event of toEvents) {
    const decoded = decodeImplicationAttestationEvent(event);
    if (decoded) {
      decodedToEvents.push(decoded);
    }
  }

  const implications = filterByTrustedAttesters(foldImplications(decodedToEvents), trustedAttesters);

  if (implications.length === 0) {
    return [];
  }

  const fromCids = implications.map(i => i.fromStatementCid);
  const allBeliefEvents = await Promise.all(
    fromCids.map(cid =>
      fetchEvents(machinery, {
        contractAddress: contracts.beliefs,
        eventName: 'DirectSupport',
        topic2: cidToBytes32(cid as IpfsCidV1),
        limit: 10000,
      })
    )
  );

  const decodedAllBeliefs: DecodedDirectSupportEvent[] = [];
  for (const events of allBeliefEvents) {
    for (const event of events) {
      const decoded = decodeDirectSupportEvent(event);
      if (decoded) decodedAllBeliefs.push(decoded);
    }
  }

  const foldedAll = foldAllStatements(decodedAllBeliefs);

  const userToViaStatementCid = new Map<string, IpfsCidV1>();

  for (const implication of implications) {
    const counts = foldedAll.get(implication.fromStatementCid);
    if (!counts || counts.believerCount === 0) continue;

    const fromEvents = await fetchEvents(machinery, {
      contractAddress: contracts.beliefs,
      eventName: 'DirectSupport',
      topic2: cidToBytes32(implication.fromStatementCid as IpfsCidV1),
      limit: 10000,
    });

    const decodedFromEvents: DecodedDirectSupportEvent[] = [];
    for (const event of fromEvents) {
      const decoded = decodeDirectSupportEvent(event);
      if (decoded) decodedFromEvents.push(decoded);
    }

    const folded = foldStatementBeliefs(decodedFromEvents);

    for (const [user, beliefState] of folded.beliefs.entries()) {
      if (beliefState === 1 && !userToViaStatementCid.has(user)) {
        userToViaStatementCid.set(user, implication.fromStatementCid);
      }
    }
  }

  const supporters: IndirectSupporter[] = [];

  for (const [user, viaStatementCid] of userToViaStatementCid.entries()) {
    const targetBelief = await getUserBelief(machinery, user, statementCid);
    if (!targetBelief || targetBelief.beliefState !== 2) {
      supporters.push({
        user: user,
        viaStatementCid,
      });
    }
  }

  return supporters;
}

/**
 * Get the count of indirect supporters for a statement.
 *
 * Convenience wrapper around {@link getIndirectSupporters}.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param statementCid - CIDv1 of the target statement
 * @param trustedAttesters - Optional list of attester addresses to filter implications by
 * @returns Number of indirect supporters
 */
export async function getIndirectSupporterCount(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  trustedAttesters?: string[]
): Promise<number> {
  const supporters = await getIndirectSupporters(machinery, statementCid, trustedAttesters);
  return supporters.length;
}

// ============================================================================
// Statement Discovery & Browsing Queries (Event Cache + Folds)
// ============================================================================

async function enrichWithIPFSContent(
  machinery: SDKMachinery,
  items: StatementListItem[]
): Promise<StatementListItem[]> {
  return Promise.all(items.map(async item => {
    try {
      const doc = await fetchFromIPFS(machinery.ipfsConfig, item.cid, 5000).catch(() => null);
      const content = (doc as Record<string, unknown>)?.content ?? '';
      if (content) {
        return { ...item, title: String(content).split('\n')[0].slice(0, 200), excerpt: String(content).slice(0, 200) };
      }
    } catch {
      // ignore IPFS errors; item title/excerpt stays empty
    }
    return item;
  }));
}

/**
 * Browse statements sorted by number of direct believers.
 *
 * Fetches all DirectSupport events, folds them to compute believer counts,
 * sorts by count, and enriches the page with IPFS content (title/excerpt).
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param options - Pagination (limit, offset) and sort direction
 * @returns Paginated array of statement list items
 */
export async function browseStatementsByMostSupporters(
  machinery: SDKMachinery,
  options: BrowseStatementsOptions = {}
): Promise<StatementListItem[]> {
  const { limit = 10, offset = 0, orderDirection = 'desc' } = options;

  const contracts = machinery.contractAddresses!;

  const allEvents = await fetchEvents(machinery, {
    contractAddress: contracts.beliefs,
    eventName: 'DirectSupport',
    limit: 10000,
  });

  const decodedEvents: DecodedDirectSupportEvent[] = [];
  for (const event of allEvents) {
    const decoded = decodeDirectSupportEvent(event);
    if (decoded) decodedEvents.push(decoded);
  }

  const firstTimestamp = new Map<string, bigint>();
  for (const e of decodedEvents) {
    const existing = firstTimestamp.get(e.statementId);
    if (!existing || e.blockTimestamp < existing) {
      firstTimestamp.set(e.statementId, e.blockTimestamp);
    }
  }

  const beliefCounts = foldAllStatements(decodedEvents);

  const items: StatementListItem[] = [...beliefCounts.keys()].map(cidV1 => {
    const counts = beliefCounts.get(cidV1)!;
    const ts = firstTimestamp.get(cidV1);
    return {
      id: cidV1,
      cid: cidV1 as IpfsCidV1,
      statementType: '',
      title: '',
      excerpt: '',
      believerCount: counts.believerCount,
      disbelieverCount: counts.disbelieverCount,
      createdAt: ts ? new Date(Number(ts) * 1000).toISOString() : '',
    };
  });

  items.sort((a, b) => {
    const diff = a.believerCount - b.believerCount;
    return orderDirection === 'asc' ? diff : -diff;
  });

  const page = items.slice(offset, offset + limit);
  return enrichWithIPFSContent(machinery, page);
}

/**
 * Browse statements sorted by creation date (newest first by default).
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param options - Pagination (limit, offset) and sort direction
 * @returns Paginated array of statement list items
 */
export async function browseStatementsByNewest(
  machinery: SDKMachinery,
  options: BrowseStatementsOptions = {}
): Promise<StatementListItem[]> {
  const { limit = 10, offset = 0, orderDirection = 'desc' } = options;

  const contracts = machinery.contractAddresses!;

  const allEvents = await fetchEvents(machinery, {
    contractAddress: contracts.beliefs,
    eventName: 'DirectSupport',
    limit: 10000,
  });

  const decodedEvents: DecodedDirectSupportEvent[] = [];
  for (const event of allEvents) {
    const decoded = decodeDirectSupportEvent(event);
    if (decoded) decodedEvents.push(decoded);
  }

  const firstSeen = new Map<string, { blockTimestamp: bigint; blockNumber: bigint }>();
  for (const e of decodedEvents) {
    const existing = firstSeen.get(e.statementId);
    if (!existing || e.blockTimestamp < existing.blockTimestamp
      || (e.blockTimestamp === existing.blockTimestamp && e.blockNumber < existing.blockNumber)) {
      firstSeen.set(e.statementId, { blockTimestamp: e.blockTimestamp, blockNumber: e.blockNumber });
    }
  }

  const beliefCounts = foldAllStatements(decodedEvents);

  const items: (StatementListItem & { _blockNumber: bigint })[] = [...beliefCounts.keys()].map(cidV1 => {
    const counts = beliefCounts.get(cidV1)!;
    const seen = firstSeen.get(cidV1);
    return {
      id: cidV1,
      cid: cidV1 as IpfsCidV1,
      statementType: '',
      title: '',
      excerpt: '',
      believerCount: counts.believerCount,
      disbelieverCount: counts.disbelieverCount,
      createdAt: seen ? new Date(Number(seen.blockTimestamp) * 1000).toISOString() : '',
      _blockNumber: seen?.blockNumber ?? 0n,
    };
  });

  items.sort((a, b) => {
    const diff = a.createdAt.localeCompare(b.createdAt)
      || Number(a._blockNumber - b._blockNumber);
    return orderDirection === 'asc' ? diff : -diff;
  });

  const page: StatementListItem[] = items.slice(offset, offset + limit).map(({ _blockNumber: _, ...item }) => item);
  return enrichWithIPFSContent(machinery, page);
}

/**
 * Browse statements with configurable sort order.
 *
 * Delegates to {@link browseStatementsByMostSupporters} for believerCount/disbelieverCount
 * ordering, or {@link browseStatementsByNewest} for date ordering.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param options - Pagination, sort field (orderBy), and sort direction
 * @returns Paginated array of statement list items
 */
export async function browseStatements(
  machinery: SDKMachinery,
  options: BrowseStatementsOptions = {}
): Promise<StatementListItem[]> {
  const { orderBy = 'createdAt' } = options;

  if (orderBy === 'believerCount' || orderBy === 'disbelieverCount') {
    return browseStatementsByMostSupporters(machinery, options);
  }
  return browseStatementsByNewest(machinery, options);
}

/**
 * Get all statements as a basic paginated list (no IPFS enrichment).
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param options - Pagination (limit, offset)
 * @returns Array of statement list items (title/excerpt will be empty)
 */
export async function getAllStatements(
  machinery: SDKMachinery,
  options: BrowseStatementsOptions = {}
): Promise<StatementListItem[]> {
  const { limit = 100, offset = 0 } = options;

  const contracts = machinery.contractAddresses!;

  const allEvents = await fetchEvents(machinery, {
    contractAddress: contracts.beliefs,
    eventName: 'DirectSupport',
    limit: 10000,
  });

  const decodedEvents: DecodedDirectSupportEvent[] = [];
  for (const event of allEvents) {
    const decoded = decodeDirectSupportEvent(event);
    if (decoded) decodedEvents.push(decoded);
  }

  const firstTimestamp = new Map<string, bigint>();
  for (const e of decodedEvents) {
    const existing = firstTimestamp.get(e.statementId);
    if (!existing || e.blockTimestamp < existing) {
      firstTimestamp.set(e.statementId, e.blockTimestamp);
    }
  }

  const beliefCounts = foldAllStatements(decodedEvents);

  const items: StatementListItem[] = [...beliefCounts.keys()].map(cidV1 => {
    const counts = beliefCounts.get(cidV1)!;
    const ts = firstTimestamp.get(cidV1);
    return {
      id: cidV1,
      cid: cidV1 as IpfsCidV1,
      statementType: '',
      title: '',
      excerpt: '',
      believerCount: counts.believerCount,
      disbelieverCount: counts.disbelieverCount,
      createdAt: ts ? new Date(Number(ts) * 1000).toISOString() : '',
    };
  });

  return items.slice(offset, offset + limit);
}

/**
 * Get all statements a user directly believes (beliefState = 1).
 *
 * Fetches the user's DirectSupport events, filters for active beliefs,
 * then enriches each statement with IPFS content.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param userAddress - Ethereum address of the user
 * @returns Array of statement list items the user believes
 */
export async function getUserBeliefs(
  machinery: SDKMachinery,
  userAddress: string
): Promise<StatementListItem[]> {
  const contracts = machinery.contractAddresses!;
  const paddedUser = padAddressAsTopic(userAddress);

  const events = await fetchEvents(machinery, {
    contractAddress: contracts.beliefs,
    eventName: 'DirectSupport',
    topic1: paddedUser,
    limit: 10000,
  });

  const decodedEvents: DecodedDirectSupportEvent[] = [];
  for (const event of events) {
    const decoded = decodeDirectSupportEvent(event);
    if (decoded) decodedEvents.push(decoded);
  }

  const userBeliefs = foldUserBeliefs(decodedEvents);
  const believedCids = userBeliefs
    .filter(b => b.beliefState === 1)
    .map(b => b.statementCid);

  if (believedCids.length === 0) return [];

  const results = await Promise.all(believedCids.map(async cid => {
    const [stmt, doc] = await Promise.all([
      getStatement(machinery, cid),
      fetchFromIPFS(machinery.ipfsConfig, cid, 5000).catch(() => null),
    ]);
    if (!stmt) return null;
    const content = String((doc as Record<string, unknown>)?.content ?? '');
    return {
      id: stmt.id,
      cid: stmt.cid,
      statementType: stmt.statementType ?? '',
      title: content ? content.split('\n')[0].slice(0, 200) : '',
      excerpt: content ? content.slice(0, 200) : '',
      believerCount: stmt.believerCount,
      disbelieverCount: stmt.disbelieverCount,
      createdAt: stmt.createdAt ?? '',
    } as StatementListItem;
  }));
  return results.filter((item): item is StatementListItem => item !== null);
}

/**
 * Get all statements a user directly disbelieves (beliefState = 2).
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param userAddress - Ethereum address of the user
 * @returns Array of statement list items the user disbelieves
 */
export async function getUserDisbeliefs(
  machinery: SDKMachinery,
  userAddress: string
): Promise<StatementListItem[]> {
  const contracts = machinery.contractAddresses!;
  const paddedUser = padAddressAsTopic(userAddress);

  const events = await fetchEvents(machinery, {
    contractAddress: contracts.beliefs,
    eventName: 'DirectSupport',
    topic1: paddedUser,
    limit: 10000,
  });

  const decodedEvents: DecodedDirectSupportEvent[] = [];
  for (const event of events) {
    const decoded = decodeDirectSupportEvent(event);
    if (decoded) decodedEvents.push(decoded);
  }

  const userBeliefs = foldUserBeliefs(decodedEvents);
  const disbelievedCids = userBeliefs
    .filter(b => b.beliefState === 2)
    .map(b => b.statementCid);

  if (disbelievedCids.length === 0) return [];

  const results = await Promise.all(disbelievedCids.map(async cid => {
    const [stmt, doc] = await Promise.all([
      getStatement(machinery, cid),
      fetchFromIPFS(machinery.ipfsConfig, cid, 5000).catch(() => null),
    ]);
    if (!stmt) return null;
    const content = String((doc as Record<string, unknown>)?.content ?? '');
    return {
      id: stmt.id,
      cid: stmt.cid,
      statementType: stmt.statementType ?? '',
      title: content ? content.split('\n')[0].slice(0, 200) : '',
      excerpt: content ? content.slice(0, 200) : '',
      believerCount: stmt.believerCount,
      disbelieverCount: stmt.disbelieverCount,
      createdAt: stmt.createdAt ?? '',
    } as StatementListItem;
  }));
  return results.filter((item): item is StatementListItem => item !== null);
}

/**
 * Get statement suggestions related to a given statement.
 *
 * Returns statements connected via the implication graph that have more
 * supporters than the source statement, sorted by supporter count.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param statementCid - CIDv1 of the source statement
 * @param trustedAttesters - Optional list of attester addresses to filter implications by
 * @returns Array of suggested statements with relationship info, sorted by believer count
 */
export async function getStatementSuggestions(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  trustedAttesters?: string[]
): Promise<Array<{
  statement: StatementListItem;
  reason: string;
  relationshipType: string;
}>> {
  const suggestions: Array<{
    statement: StatementListItem;
    reason: string;
    relationshipType: string;
  }> = [];

  const sourceStatement = await getStatement(machinery, statementCid);
  if (!sourceStatement) {
    return [];
  }

  const implicationsFrom = await getImplicationsFrom(machinery, statementCid, trustedAttesters);

  for (const implication of implicationsFrom) {
    const targetStatement = await getStatement(machinery, implication.toStatementCid);
    if (targetStatement && targetStatement.believerCount > sourceStatement.believerCount) {
      suggestions.push({
        statement: {
          id: targetStatement.id,
          cid: targetStatement.cid,
          statementType: targetStatement.statementType || '',
          title: targetStatement.title || '',
          excerpt: targetStatement.excerpt || '',
          believerCount: targetStatement.believerCount,
          disbelieverCount: targetStatement.disbelieverCount,
          createdAt: targetStatement.createdAt || '',
        },
        reason: `This statement is implied by the current statement and has ${targetStatement.believerCount} supporters (more than the current statement's ${sourceStatement.believerCount})`,
        relationshipType: 'implies',
      });
    }
  }

  const implicationsTo = await getImplicationsTo(machinery, statementCid, trustedAttesters);

  for (const implication of implicationsTo) {
    const sourceOfImplication = await getStatement(machinery, implication.fromStatementCid);
    if (sourceOfImplication && sourceOfImplication.believerCount > sourceStatement.believerCount) {
      suggestions.push({
        statement: {
          id: sourceOfImplication.id,
          cid: sourceOfImplication.cid,
          statementType: sourceOfImplication.statementType || '',
          title: sourceOfImplication.title || '',
          excerpt: sourceOfImplication.excerpt || '',
          believerCount: sourceOfImplication.believerCount,
          disbelieverCount: sourceOfImplication.disbelieverCount,
          createdAt: sourceOfImplication.createdAt || '',
        },
        reason: `This statement implies the current statement and has ${sourceOfImplication.believerCount} supporters (more than the current statement's ${sourceStatement.believerCount})`,
        relationshipType: 'impliedBy',
      });
    }
  }

  suggestions.sort((a, b) => b.statement.believerCount - a.statement.believerCount);

  return suggestions;
}

// ============================================================================
// Composite Functions
// ============================================================================

/**
 * Get a statement's on-chain metadata together with its IPFS content document.
 *
 * Optionally includes computed metrics (direct believers, disbelievers,
 * indirect supporters).
 *
 * @param machinery - SDK machinery with event cache and IPFS configuration
 * @param statementCid - CIDv1 of the statement
 * @param options - Include metrics, IPFS timeout, trusted attesters for indirect support
 * @returns Statement with content, or null if the statement doesn't exist on-chain
 */
export async function getStatementWithContent(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  options: GetStatementWithContentOptions = {}
): Promise<StatementWithContent | null> {
  const {
    includeMetrics = false,
    timeout = 10000,
    trustedAttesters,
  } = options;

  const statement = await getStatement(machinery, statementCid);
  if (!statement) {
    return null;
  }

  let content: DisplayableDocument | null = null;
  if (statement.cid) {
    content = await fetchFromIPFS(machinery.ipfsConfig, statement.cid, timeout) as DisplayableDocument | null;
  }

  let metrics: StatementWithContent['metrics'] | undefined;
  if (includeMetrics) {
    const indirectSupporters = await getIndirectSupporterCount(
      machinery,
      statementCid,
      trustedAttesters
    );

    metrics = {
      directBelievers: statement.believerCount,
      directDisbelievers: statement.disbelieverCount,
      indirectSupporters,
    };
  }

  return {
    statement,
    content,
    metrics,
  };
}

/**
 * Get all statements a user indirectly supports through their beliefs and implications.
 *
 * Traverses the implication graph from the user's directly-believed statements,
 * excludes statements the user has already expressed a direct opinion on,
 * and returns the remaining targets with the "via" paths.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param userAddress - Ethereum address of the user
 * @param options - Pagination (limit, offset), trusted attesters for implications
 * @returns Paginated array of indirectly supported statements with via paths
 */
export async function getUserIndirectSupport(
  machinery: SDKMachinery,
  userAddress: string,
  options: GetUserIndirectSupportOptions = {}
): Promise<IndirectSupportInfo[]> {
  const userBeliefsList = await getUserBeliefs(machinery, userAddress);

  if (userBeliefsList.length === 0) {
    return [];
  }

  const implicationsQueries = userBeliefsList.map(belief =>
    getImplicationsFrom(machinery, belief.cid, options.trustedAttesters)
  );

  const implicationsResults = await Promise.all(implicationsQueries);

  const targetToSources = new Map<IpfsCidV1, Set<IpfsCidV1>>();
  const allTargetStatementCids = new Set<IpfsCidV1>();

  userBeliefsList.forEach((belief, idx) => {
    const implications = implicationsResults[idx];
    implications.forEach(implication => {
      const targetCid = normalizeCidV1(implication.toStatementCid);
      allTargetStatementCids.add(targetCid);

      if (!targetToSources.has(targetCid)) {
        targetToSources.set(targetCid, new Set());
      }
      targetToSources.get(targetCid)!.add(belief.cid);
    });
  });

  if (allTargetStatementCids.size === 0) {
    return [];
  }

  const targetCids = Array.from(allTargetStatementCids);
  const beliefChecks = targetCids.map(targetCid =>
    getUserBelief(machinery, userAddress, targetCid)
  );

  const beliefStates = await Promise.all(beliefChecks);

  const indirectlySupportedCids = targetCids.filter((_, idx) => {
    const beliefState = beliefStates[idx];
    return !beliefState || beliefState.beliefState === 0;
  });

  if (indirectlySupportedCids.length === 0) {
    return [];
  }

  const statementQueries = indirectlySupportedCids.map(cid => getStatement(machinery, cid));
  const statements = await Promise.all(statementQueries);

  const results: IndirectSupportInfo[] = [];

  for (let i = 0; i < indirectlySupportedCids.length; i++) {
    const targetCid = indirectlySupportedCids[i];
    const statement = statements[i] ?? {
      id: targetCid,
      cid: targetCid,
      believerCount: 0,
      disbelieverCount: 0,
      createdAt: '',
    } as unknown as Statement;

    const sourceIds = Array.from(targetToSources.get(targetCid) || []);
    const sourceStatements = userBeliefsList.filter(b => sourceIds.includes(b.cid));

    results.push({
      statement: statement as StatementListItem,
      supportedVia: sourceStatements.map(source => ({
        directlyBelievedStatement: source,
        viaStatementCid: source.cid,
      })),
    });
  }

  const start = options.offset || 0;
  const end = options.limit ? start + options.limit : undefined;

  return results.slice(start, end);
}

/** Options for {@link getHighProfileSigners}. */
export interface GetHighProfileSignersOptions {
  /** Minimum Twitter follower count to qualify as "high-profile" (default: 10000). */
  minFollowers?: number;
}

/**
 * Get high-profile signers (believers) of a statement, ranked by follower count.
 *
 * Fetches all believers for a statement, looks up their social data, and
 * returns those meeting the minimum follower threshold.
 *
 * @param machinery - SDK machinery with event cache and Twitter API configuration
 * @param statementCid - CIDv1 of the statement
 * @param options - Minimum follower count threshold
 * @returns Array of high-profile signers sorted by follower count (descending)
 */
export async function getHighProfileSigners(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  options: GetHighProfileSignersOptions = {}
): Promise<HighProfileSigner[]> {
  const { minFollowers = 10000 } = options;
  const contracts = machinery.contractAddresses!;

  const events = await fetchEvents(machinery, {
    contractAddress: contracts.beliefs,
    eventName: 'DirectSupport',
    topic2: cidToBytes32(statementCid),
    limit: 10000,
  });

  const decodedEvents: DecodedDirectSupportEvent[] = [];
  for (const event of events) {
    const decoded = decodeDirectSupportEvent(event);
    if (decoded) {
      decodedEvents.push(decoded);
    }
  }

  const folded = foldStatementBeliefs(decodedEvents);

  const highProfileSigners: HighProfileSigner[] = [];

  for (const [userAddress, beliefState] of folded.beliefs.entries()) {
    if (beliefState !== 1) continue;

    const socialData = await getUserSocialData(machinery, userAddress);
    if (socialData &&
        socialData.twitterFollowerCount &&
        socialData.twitterFollowerCount >= minFollowers) {
      highProfileSigners.push({
        address: userAddress,
        ensName: socialData.ensName,
        twitterHandle: socialData.twitterHandle,
        followerCount: socialData.twitterFollowerCount,
      });
    }
  }

  return highProfileSigners.sort((a, b) => (b.followerCount || 0) - (a.followerCount || 0));
}

/**
 * Fetch social data (ENS name, Twitter handle, follower count) for an Ethereum address.
 *
 * @param _machinery - SDK machinery with Twitter API configuration
 * @param address - Ethereum address to look up
 * @returns Social data for the address
 */
export async function getUserSocialData(
  _machinery: SDKMachinery,
  address: string,
  options: {
    twitterHandleHint?: string;
  } = {},
): Promise<UserSocialData | null> {
  const data = await fetchAddressSocialData(_machinery.twitterApiConfig, address);
  const verifiedAssociation = await resolveTwitterAssociationViaChannelRegistry(
    _machinery,
    address,
    options.twitterHandleHint ?? data.twitterHandle,
  );
  const twitterHandle = verifiedAssociation?.twitterHandle ?? data.twitterHandle;
  const twitterFollowerCount = verifiedAssociation && data.twitterFollowerCount === undefined
    ? await fetchFollowerCountForTwitterHandle(_machinery.twitterApiConfig, verifiedAssociation.twitterHandle)
    : data.twitterFollowerCount;

  return {
    address,
    ensName: data.ensName,
    twitterHandle,
    twitterFollowerCount,
    isTwitterVerified: verifiedAssociation !== null || data.isTwitterVerified,
    twitterAssociationSource: verifiedAssociation !== null
      ? 'channel-registry'
      : data.twitterHandle
        ? 'ens'
        : undefined,
    socialDataFetched: true,
    fetchedAt: new Date().toISOString(),
  };
}

function normalizeTwitterHandleHint(handle: string): string {
  const trimmed = handle.trim();
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

interface ResolvedTwitterChannel {
  channelId: string;
  handle?: string;
}

async function resolveTwitterChannelAssociation(
  machinery: SDKMachinery,
  handle: string,
): Promise<ResolvedTwitterChannel | null> {
  const baseUrl = machinery.twitterApiConfig.platformApiBaseUrl;
  if (!baseUrl) {
    return null;
  }

  const response = await fetch(`${baseUrl}/resolve/channel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      platform: 'twitter',
      handle: normalizeTwitterHandleHint(handle),
    }),
  });

  if (!response.ok) {
    return null;
  }

  const resolved = await response.json() as ResolvedTwitterChannel;
  return typeof resolved.channelId === 'string' ? resolved : null;
}

async function resolveTwitterAssociationViaChannelRegistry(
  machinery: SDKMachinery,
  address: string,
  handleHint?: string,
): Promise<{ twitterHandle: string } | null> {
  if (!handleHint) {
    return null;
  }

  const contentFunding = await fetchAndFoldContentFundingState(machinery);
  if (!contentFunding) {
    return null;
  }

  const resolvedChannel = await resolveTwitterChannelAssociation(machinery, handleHint);
  if (!resolvedChannel?.channelId) {
    return null;
  }

  const owner = getOwnerForCanonicalChannelId(contentFunding.state, resolvedChannel.channelId);
  if (!owner || owner.toLowerCase() !== address.toLowerCase()) {
    return null;
  }

  return {
    twitterHandle: normalizeTwitterHandleHint(resolvedChannel.handle ?? handleHint),
  };
}
