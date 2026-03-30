/**
 * Conceptspace queries — event cache + folds (no GraphQL)
 */

import { fetchFromIPFS } from '../../utils/ipfs.js';
import { fetchEvents, padAddressAsTopic } from '../../utils/eventCacheClient.js';
import { decodeDirectSupportEvent, decodeImplicationAttestationEvent, type DecodedDirectSupportEvent, type DecodedImplicationAttestationEvent } from '../../utils/eventDecoder.js';
import { foldStatementBeliefs, foldUserBeliefs, foldAllStatements, foldImplications } from './folds.js';
import {
  type Implication,
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
import { fetchAddressSocialData } from '../../utils/twitter.js';
import { SDKMachinery } from '../../machinery.js';

// ============================================================================
// Type Definitions
// ============================================================================

export interface StatementSuggestion {
  statement: StatementListItem;
  reason: string;
  relationshipType: string;
}


// ============================================================================
// Conceptspace Queries (Event Cache + Folds)
// ============================================================================

/**
 * Get statement by ID
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
 * Get user's belief about a statement
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
 * Get implications from a statement (what it implies)
 */
export async function getImplicationsFrom(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  attesterAddress?: string
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

  let implications = foldImplications(decodedEvents);

  if (attesterAddress) {
    const attesterLower = attesterAddress.toLowerCase();
    implications = implications.filter(i => i.attester.toLowerCase() === attesterLower);
  }

  return implications;
}

/**
 * Get implications to a statement (what implies it)
 */
export async function getImplicationsTo(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  attesterAddress?: string
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

  let implications = foldImplications(decodedEvents);

  if (attesterAddress) {
    const attesterLower = attesterAddress.toLowerCase();
    implications = implications.filter(i => i.attester.toLowerCase() === attesterLower);
  }

  return implications;
}

/**
 * Get a specific implication attestation
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
 */
export async function getIndirectSupporters(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  attesterAddress?: string
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

  let implications = foldImplications(decodedToEvents);

  if (attesterAddress) {
    const attesterLower = attesterAddress.toLowerCase();
    implications = implications.filter(i => i.attester.toLowerCase() === attesterLower);
  }

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
 * Get count of indirect supporters for a statement.
 */
export async function getIndirectSupporterCount(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  attesterAddress?: string
): Promise<number> {
  const supporters = await getIndirectSupporters(machinery, statementCid, attesterAddress);
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
 * Browse statements by most supporters (direct believers)
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
 * Browse newest statements
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
 * Browse statements with configurable sort
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
 * Get all statements (for basic listing)
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
 * Get statements a user directly believes
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
 * Get statements a user directly disbelieves
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
 * Get statement suggestions for a given statement
 */
export async function getStatementSuggestions(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  attesterAddress?: string
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

  const implicationsFrom = await getImplicationsFrom(machinery, statementCid, attesterAddress);

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

  const implicationsTo = await getImplicationsTo(machinery, statementCid, attesterAddress);

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
 * Get statement with IPFS content and optional metrics.
 */
export async function getStatementWithContent(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  options: GetStatementWithContentOptions = {}
): Promise<StatementWithContent | null> {
  const {
    includeMetrics = false,
    timeout = 10000,
    attesterAddress,
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
      attesterAddress
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
    getImplicationsFrom(machinery, belief.cid, options.trustedAttesters?.[0])
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

export interface GetHighProfileSignersOptions {
  minFollowers?: number;
}

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

export async function getUserSocialData(
  _machinery: SDKMachinery,
  address: string
): Promise<UserSocialData | null> {
  const data = await fetchAddressSocialData(address);
  return {
    address,
    ensName: data.ensName,
    twitterHandle: data.twitterHandle,
    twitterFollowerCount: data.twitterFollowerCount,
    isTwitterVerified: data.isTwitterVerified,
    socialDataFetched: true,
    fetchedAt: new Date().toISOString(),
  };
}


