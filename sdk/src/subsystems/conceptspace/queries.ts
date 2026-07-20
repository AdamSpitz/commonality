/**
 * Conceptspace queries — event cache + folds (no GraphQL)
 */

import { type Address } from 'viem';
import { fetchEvents, padAddressAsTopic, type EventQueryParams } from '../../utils/eventCacheClient.js';
import {
  decodeDirectSupportEvent,
  decodeImplicationAttestationEvent,
  type DecodedDirectSupportEvent,
  type DecodedImplicationAttestationEvent,
} from '../../utils/eventDecoder.js';
import {
  foldStatementBeliefs,
  foldUserBeliefs,
  foldAllStatements,
  foldImplications,
} from './folds.js';
import {
  computeAnonymizedId,
  foldAnonymizedBelieverIds,
  unionAnonymizedBelieverIds,
  computeTieredHeadCount,
  type AnonymizedId,
  type TieredHeadCount,
} from '../identity/unique-human-id.js';
import { getKnownProofTiers } from '../identity/queries.js';
import {
  type Implication,
  type Statement,
  type UserBelief,
  type IndirectSupporter,
  type IndirectSupportTieredHeadCountOptions,
  type StatementListItem,
  type BrowseStatementsOptions,
  type StatementWithContent,
  type StatementContentStatus,
  type GetStatementWithContentOptions,
  type IndirectSupportInfo,
  type GetUserIndirectSupportOptions,
} from './types.js';
import { type DisplayableDocument, createDefaultDocumentReader, type DocumentReadResult } from '../displayable-documents/displayable-document.js';
import { IpfsCidV1, normalizeCidV1, cidToBytes32 } from '../../utils/cid-types.js';
import { SDKMachinery } from '../../machinery.js';

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

const GLOBAL_DIRECT_SUPPORT_EVENT_LIMIT = 10000;

function assertUntruncatedGlobalDirectSupportEvents(
  events: readonly unknown[],
  queryName: string,
): void {
  if (events.length === GLOBAL_DIRECT_SUPPORT_EVENT_LIMIT) {
    throw new Error(
      `${queryName} fetched exactly ${GLOBAL_DIRECT_SUPPORT_EVENT_LIMIT} DirectSupport events; `
      + 'the global event set may be truncated. Refusing to rank or paginate on incomplete data.',
    );
  }
}

async function fetchDecodedDirectSupportEvents(
  machinery: SDKMachinery,
  params: Omit<EventQueryParams, 'eventName'>,
): Promise<DecodedDirectSupportEvent[]> {
  const events = await fetchEvents(machinery, { ...params, eventName: 'DirectSupport' });
  const decoded: DecodedDirectSupportEvent[] = [];
  for (const event of events) {
    const d = decodeDirectSupportEvent(event);
    if (d) decoded.push(d);
  }
  return decoded;
}

async function fetchDecodedImplicationAttestationEvents(
  machinery: SDKMachinery,
  params: Omit<EventQueryParams, 'eventName'>,
): Promise<DecodedImplicationAttestationEvent[]> {
  const events = await fetchEvents(machinery, { ...params, eventName: 'ImplicationAttestation' });
  const decoded: DecodedImplicationAttestationEvent[] = [];
  for (const event of events) {
    const d = decodeImplicationAttestationEvent(event);
    if (d) decoded.push(d);
  }
  return decoded;
}

async function fetchAllDirectSupportEvents(
  machinery: SDKMachinery,
  queryName: string,
): Promise<DecodedDirectSupportEvent[]> {
  const events = await fetchEvents(machinery, {
    eventName: 'DirectSupport',
    limit: GLOBAL_DIRECT_SUPPORT_EVENT_LIMIT,
  });

  assertUntruncatedGlobalDirectSupportEvents(events, queryName);

  const decoded: DecodedDirectSupportEvent[] = [];
  for (const event of events) {
    const d = decodeDirectSupportEvent(event);
    if (d) decoded.push(d);
  }
  return decoded;
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
  const decodedEvents = await fetchDecodedDirectSupportEvents(machinery, {
    topic2: cidToBytes32(statementCid),
    limit: 10000,
  });

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
  const decodedEvents = await fetchDecodedDirectSupportEvents(machinery, {
    topic2: cidToBytes32(statementCid),
    limit: 10000,
  });

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
  const decodedEvents = await fetchDecodedImplicationAttestationEvents(machinery, {
    topic2: cidToBytes32(statementCid),
    limit: 10000,
  });

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
  const decodedEvents = await fetchDecodedImplicationAttestationEvents(machinery, {
    topic3: cidToBytes32(statementCid),
    limit: 10000,
  });

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
  const decodedEvents = await fetchDecodedImplicationAttestationEvents(machinery, {
    topic2: cidToBytes32(fromStatementCid),
    topic3: cidToBytes32(toStatementCid),
    limit: 1000,
  });

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
  const { supporters } = await computeIndirectSupport(machinery, statementCid, trustedAttesters);
  return supporters;
}

/**
 * Internal shared computation behind {@link getIndirectSupporters} and the
 * tiered head-count path. Returns the indirect-supporter list plus the
 * deduped anonymized-ID sets that proof-of-personhood tiers attach to:
 *
 *   - `directBelieverIds`  — anchors whose latest belief on the *target*
 *     statement is "believes".
 *   - `indirectBelieverIds` — the Tally set-union of believer IDs across the
 *     implying statements, with target-disbelievers excluded.
 *
 * Both sets are deduped by anonymized anchor ID (see
 * `specs/tech/shared/unique-human-id.md`); today address → anonymized_ID is
 * 1:1, so counts are unchanged from the raw-address era, but the anonymized-ID
 * key is the seam proof-of-personhood tiers will attach to.
 */
async function computeIndirectSupport(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  trustedAttesters?: string[],
): Promise<{
  supporters: IndirectSupporter[];
  directBelieverIds: Set<AnonymizedId>;
  indirectBelieverIds: Set<AnonymizedId>;
}> {
  const decodedToEvents = await fetchDecodedImplicationAttestationEvents(machinery, {
    topic3: cidToBytes32(statementCid),
    limit: 10000,
  });

  const implications = filterByTrustedAttesters(foldImplications(decodedToEvents), trustedAttesters);

  const decodedTargetEvents = await fetchDecodedDirectSupportEvents(machinery, {
    topic2: cidToBytes32(statementCid),
    limit: 10000,
  });

  // Tally set-union: dedupe by anonymized anchor ID, not raw address, so an
  // account that signed several equivalent (mutually-implying) statements
  // counts once. Today address → anonymized_ID is 1:1, so counts are unchanged;
  // the anonymized-ID key is the seam proof-of-personhood tiers attach to.
  const targetBeliefs = foldStatementBeliefs(decodedTargetEvents).beliefs;
  const targetDisbelieverIds = new Set<AnonymizedId>();
  const directBelieverIds = new Set<AnonymizedId>();
  for (const [user, state] of targetBeliefs.entries()) {
    const id = computeAnonymizedId(user as Address);
    if (state === 2) {
      targetDisbelieverIds.add(id);
    } else if (state === 1) {
      directBelieverIds.add(id);
    }
  }

  if (implications.length === 0) {
    return { supporters: [], directBelieverIds, indirectBelieverIds: new Set<AnonymizedId>() };
  }

  const uniqueFromCids = [...new Set(implications.map(i => i.fromStatementCid))];
  const beliefEventsByFromCid = new Map<IpfsCidV1, DecodedDirectSupportEvent[]>();

  const allBeliefEvents = await Promise.all(
    uniqueFromCids.map(async cid => {
      const decoded = await fetchDecodedDirectSupportEvents(machinery, {
        topic2: cidToBytes32(cid as IpfsCidV1),
        limit: 10000,
      });
      return { cid, decoded };
    })
  );

  for (const { cid, decoded } of allBeliefEvents) {
    beliefEventsByFromCid.set(cid, decoded);
  }

  const retractedFromCids = new Set<IpfsCidV1>();
  await Promise.all(uniqueFromCids.map(async cid => {
    const publisherCandidates = uniqueAddresses((beliefEventsByFromCid.get(cid) ?? []).map(e => e.user));
    const { status } = await fetchStatementDocument(machinery, cid, 5000, publisherCandidates);
    if (status === 'retracted') retractedFromCids.add(cid);
  }));
  const activeImplications = implications.filter(i => !retractedFromCids.has(i.fromStatementCid));

  const believerIdSetsByImplication = new Map<Implication, Set<AnonymizedId>>();
  const addressByAnonymizedId = new Map<AnonymizedId, string>();

  for (const implication of activeImplications) {
    const fromEvents = beliefEventsByFromCid.get(implication.fromStatementCid) ?? [];
    const believerIds = foldAnonymizedBelieverIds(fromEvents);
    believerIdSetsByImplication.set(implication, believerIds);
    for (const e of fromEvents) {
      const id = computeAnonymizedId(e.user);
      if (!addressByAnonymizedId.has(id)) {
        addressByAnonymizedId.set(id, e.user.toLowerCase());
      }
    }
  }

  const unionedBelieverIds = unionAnonymizedBelieverIds(
    [...believerIdSetsByImplication.values()],
  );

  // Exclude anchors that explicitly disbelieve the target (by anonymized ID).
  const indirectBelieverIds = new Set<AnonymizedId>();
  for (const id of unionedBelieverIds) {
    if (!targetDisbelieverIds.has(id)) indirectBelieverIds.add(id);
  }

  // First-implication-wins for the via-statement, mirroring the previous
  // raw-address dedupe order.
  const viaStatementCidByAnonymizedId = new Map<AnonymizedId, IpfsCidV1>();
  for (const implication of activeImplications) {
    const believerIds = believerIdSetsByImplication.get(implication)!;
    for (const id of believerIds) {
      if (!viaStatementCidByAnonymizedId.has(id)) {
        viaStatementCidByAnonymizedId.set(id, implication.fromStatementCid);
      }
    }
  }

  const supporters: IndirectSupporter[] = [];
  for (const id of indirectBelieverIds) {
    const user = addressByAnonymizedId.get(id);
    const viaStatementCid = viaStatementCidByAnonymizedId.get(id);
    if (user === undefined || viaStatementCid === undefined) continue;
    supporters.push({ user, viaStatementCid });
  }

  return { supporters, directBelieverIds, indirectBelieverIds };
}

/**
 * Compute the tiered head-count over a statement's full deduped supporter base.
 *
 * The supporter base is the Tally set-union: direct believers of this statement
 * plus indirect supporters via the implication graph, deduped by anonymized
 * anchor ID, with anchors that explicitly disbelieve the target excluded.
 * {@link computeTieredHeadCount} then groups that set by proof-of-personhood
 * strength, so the UI can render "N supporters — M with ≥1 attestation."
 *
 * `knownTiers` is the optional map from anonymized ID → tier populated by
 * whatever proof-of-personhood integration is wired up (none yet). Until a
 * provider exists every anchor is tier 0, so only `total` is nonzero — the
 * honest default that keeps the headline from reading as a verified-human
 * count. See `specs/tech/shared/unique-human-id.md`.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param statementCid - CIDv1 of the target statement
 * @param options - Trusted attesters filter + optional known proof tiers
 * @returns Tiered head-count over the deduped supporter base.
 */
export async function getStatementSupportTieredHeadCount(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  options: IndirectSupportTieredHeadCountOptions = {},
): Promise<TieredHeadCount> {
  const { trustedAttesters, knownTiers } = options;
  const { directBelieverIds, indirectBelieverIds } = await computeIndirectSupport(
    machinery,
    statementCid,
    trustedAttesters,
  );
  // Union direct + indirect believer ID sets (both already deduped by
  // anonymized ID and both already exclude target-disbelievers), then group by
  // proof-of-personhood tier.
  const supporterIds = unionAnonymizedBelieverIds([directBelieverIds, indirectBelieverIds]);
  return computeTieredHeadCount(supporterIds, knownTiers);
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

function uniqueAddresses(values: Iterable<string>): Address[] {
  return Array.from(new Set(Array.from(values, value => value.toLowerCase()))).map(value => value as Address);
}

function publisherCandidatesByStatement(events: readonly DecodedDirectSupportEvent[]): Map<string, Address[]> {
  const byStatement = new Map<string, string[]>();
  for (const event of events) {
    const existing = byStatement.get(event.statementId) ?? [];
    existing.push(event.user);
    byStatement.set(event.statementId, existing);
  }
  return new Map(Array.from(byStatement, ([cid, publishers]) => [cid, uniqueAddresses(publishers)]));
}

function statementDocumentFromReadResult(result: DocumentReadResult): { content: DisplayableDocument | null; status: StatementContentStatus } {
  switch (result.status) {
    case 'active':
      return { content: result.document, status: 'active' };
    case 'retracted':
      return { content: null, status: 'retracted' };
    case 'not-published':
    case 'invalid':
    case 'unavailable':
      return { content: null, status: 'unavailable' };
  }
}

async function fetchStatementDocument(
  machinery: SDKMachinery,
  cid: IpfsCidV1,
  timeout = 5000,
  _publisherCandidates: readonly Address[] = [],
): Promise<{ content: DisplayableDocument | null; status: StatementContentStatus }> {
  const reader = createDefaultDocumentReader(machinery, { readTimeout: timeout });
  return statementDocumentFromReadResult(await reader.read(cid));
}

async function enrichWithActiveStatementContent(
  machinery: SDKMachinery,
  items: StatementListItem[],
  publisherCandidates = new Map<string, Address[]>(),
): Promise<StatementListItem[]> {
  const enriched = await Promise.all(items.map(async item => {
    const { content: doc, status } = await fetchStatementDocument(machinery, item.cid, 5000, publisherCandidates.get(item.cid) ?? []);
    if (status === 'retracted') return null;
    const content = status === 'active' ? (doc as unknown as Record<string, unknown> | null)?.content ?? '' : '';
    return {
      ...item,
      title: String(content).split('\n')[0].slice(0, 200),
      excerpt: String(content).slice(0, 200),
    };
  }));
  return enriched.filter((item): item is StatementListItem => item !== null);
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

  const decodedEvents = await fetchAllDirectSupportEvents(machinery, 'browseStatementsByMostSupporters');

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

  const displayableItems = await enrichWithActiveStatementContent(machinery, items, publisherCandidatesByStatement(decodedEvents));
  return displayableItems.slice(offset, offset + limit);
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

  const decodedEvents = await fetchAllDirectSupportEvents(machinery, 'browseStatementsByNewest');

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

  const withoutBlockNumber: StatementListItem[] = items.map(({ _blockNumber: _, ...item }) => item);
  const displayableItems = await enrichWithActiveStatementContent(machinery, withoutBlockNumber, publisherCandidatesByStatement(decodedEvents));
  return displayableItems.slice(offset, offset + limit);
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
 * Get all displayable statements as a paginated list.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param options - Pagination (limit, offset)
 * @returns Array of statement list items with unavailable/retracted content suppressed
 */
export async function getAllStatements(
  machinery: SDKMachinery,
  options: BrowseStatementsOptions = {}
): Promise<StatementListItem[]> {
  const { limit = 100, offset = 0 } = options;

  const decodedEvents = await fetchAllDirectSupportEvents(machinery, 'getAllStatements');

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

  const displayableItems = await enrichWithActiveStatementContent(machinery, items, publisherCandidatesByStatement(decodedEvents));
  return displayableItems.slice(offset, offset + limit);
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
  const paddedUser = padAddressAsTopic(userAddress);

  const decodedEvents = await fetchDecodedDirectSupportEvents(machinery, {
    topic1: paddedUser,
    limit: 10000,
  });

  const userBeliefs = foldUserBeliefs(decodedEvents);
  const believedCids = userBeliefs
    .filter(b => b.beliefState === 1)
    .map(b => b.statementCid);

  if (believedCids.length === 0) return [];

  const results = await Promise.all(believedCids.map(async cid => {
    const [stmt, document] = await Promise.all([
      getStatement(machinery, cid),
      fetchStatementDocument(machinery, cid, 5000, [userAddress as Address]),
    ]);
    if (!stmt || document.status === 'retracted') return null;
    const content = String(document.content?.content ?? '');
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
  const paddedUser = padAddressAsTopic(userAddress);

  const decodedEvents = await fetchDecodedDirectSupportEvents(machinery, {
    topic1: paddedUser,
    limit: 10000,
  });

  const userBeliefs = foldUserBeliefs(decodedEvents);
  const disbelievedCids = userBeliefs
    .filter(b => b.beliefState === 2)
    .map(b => b.statementCid);

  if (disbelievedCids.length === 0) return [];

  const results = await Promise.all(disbelievedCids.map(async cid => {
    const [stmt, document] = await Promise.all([
      getStatement(machinery, cid),
      fetchStatementDocument(machinery, cid, 5000, [userAddress as Address]),
    ]);
    if (!stmt || document.status === 'retracted') return null;
    const content = String(document.content?.content ?? '');
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
    knownTiers,
  } = options;

  const statement = await getStatement(machinery, statementCid);
  if (!statement) {
    return null;
  }

  const statementEvents = await fetchDecodedDirectSupportEvents(machinery, {
    topic2: cidToBytes32(statementCid),
    limit: 10000,
  });

  let content: DisplayableDocument | null = null;
  let contentStatus: StatementContentStatus = 'unavailable';
  if (statement.cid) {
    const document = await fetchStatementDocument(
      machinery,
      statement.cid,
      timeout,
      uniqueAddresses(statementEvents.map(event => event.user)),
    );
    content = document.content;
    contentStatus = document.status;
  }

  let metrics: StatementWithContent['metrics'] | undefined;
  if (includeMetrics) {
    const indirectSupporters = await getIndirectSupporterCount(
      machinery,
      statementCid,
      trustedAttesters
    );
    // Auto-populate knownTiers from on-chain tier-0/1 self-declarations when
    // the caller hasn't supplied them explicitly. This makes the tiered
    // head-count UI light up automatically as soon as accounts assert, without
    // every caller having to know about the AccountAssertions contract.
    const effectiveKnownTiers = knownTiers ?? await getKnownProofTiers(machinery).catch(() => undefined);
    const tieredSupporters = await getStatementSupportTieredHeadCount(
      machinery,
      statementCid,
      { trustedAttesters, knownTiers: effectiveKnownTiers }
    );

    metrics = {
      directBelievers: statement.believerCount,
      directDisbelievers: statement.disbelieverCount,
      indirectSupporters,
      tieredSupporters,
    };
  }

  return {
    statement,
    content,
    contentStatus,
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
