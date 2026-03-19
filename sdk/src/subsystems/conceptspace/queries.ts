/**
 * GraphQL queries for Conceptspace subsystem
 */

import { fetchFromIPFS } from '../../utils/ipfs.js';
import { executeTypedGraphQLQuery } from '../../utils/graphqlClient.js';
import { fetchEvents, fetchStatementsRegistry } from '../../utils/eventCacheClient.js';
import { decodeDirectSupportEvent, decodeImplicationAttestationEvent, type DecodedDirectSupportEvent, type DecodedImplicationAttestationEvent } from '../../utils/eventDecoder.js';
import { foldStatementBeliefs, foldImplications } from './folds.js';
import {
  BrowseByMostSupportersDocument,
  BrowseByNewestDocument,
  BrowseStatementsDocument,
  GetAllStatementsDocument,
  GetUserBeliefsDocument,
  GetUserDisbeliefsDocument,
  GetUserSocialDataDocument,
} from '../../generated/graphql.js';
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

  // DirectSupport(address indexed user, bytes32 indexed statementId, uint8 beliefState)
  // topic1 = user, topic2 = statementId (bytes32)
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
  
  const statements = await fetchStatementsRegistry(machinery, { limit: 10000 });
  const statement = statements.find(s => s.cidV1 === statementCid);
  
  if (!statement && decodedEvents.length === 0) {
    return null;
  }
  
  return {
    id: statementCid,
    cid: statementCid,
    believerCount: folded.believerCount,
    disbelieverCount: folded.disbelieverCount,
    createdAt: statement?.createdAtTimestamp ? statement.createdAtTimestamp : '',
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

  // DirectSupport(address indexed user, bytes32 indexed statementId, uint8 beliefState)
  // topic1 = user, topic2 = statementId (bytes32)
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

  // ImplicationAttestation(address indexed attester, bytes32 indexed fromStatementCid, bytes32 indexed toStatementCid, bytes32 explanationCid)
  // topic1 = attester, topic2 = fromStatementCid, topic3 = toStatementCid
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

  // ImplicationAttestation: topic3 = toStatementCid
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
  
  // ImplicationAttestation: topic2 = fromStatementCid, topic3 = toStatementCid
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
    createdAt: latest.blockTimestamp.toString(),
    blockNumber: latest.blockNumber.toString(),
  };
}

// ============================================================================
// Indirect Support Computation Queries
// ============================================================================

/**
 * Compute indirect supporters for a statement.
 * Returns users who believe statements that imply the target statement.
 * Excludes users who explicitly disbelieve the target statement.
 *
 * @param client GraphQL client
 * @param statementId Target statement ID
 * @param attesterAddress Optional: filter implications by specific attester
 */
export async function getIndirectSupporters(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  attesterAddress?: string
): Promise<IndirectSupporter[]> {
  const contracts = machinery.contractAddresses!;

  // ImplicationAttestation: topic3 = toStatementCid
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

  // Collect unique users to avoid duplicate getUserBelief calls when a user
  // believes multiple source statements that all imply the same target.
  const userToViaStatementCid = new Map<string, IpfsCidV1>();

  for (const implication of implications) {
    // DirectSupport: topic2 = statementId (bytes32)
    const fromEvents = await fetchEvents(machinery, {
      contractAddress: contracts.beliefs,
      eventName: 'DirectSupport',
      topic2: cidToBytes32(implication.fromStatementCid as IpfsCidV1),
      limit: 10000,
    });

    const decodedFromEvents: DecodedDirectSupportEvent[] = [];
    for (const event of fromEvents) {
      const decoded = decodeDirectSupportEvent(event);
      if (decoded) {
        decodedFromEvents.push(decoded);
      }
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
// Statement Discovery & Browsing Queries (GraphQL)
// ============================================================================

/**
 * Browse statements by most supporters (direct believers)
 */
export async function browseStatementsByMostSupporters(
  machinery: SDKMachinery,
  options: BrowseStatementsOptions = {}
): Promise<StatementListItem[]> {
  const { limit = 10, offset = 0, orderDirection = 'desc' } = options;

  const result = await executeTypedGraphQLQuery(machinery, BrowseByMostSupportersDocument, {
    limit,
    offset,
    orderDirection,
  });
  return ((result.statementss?.items ?? []) as unknown as Array<{ cidV1: string }>).map((item) => ({ ...item, id: item.cidV1, cid: item.cidV1 })) as unknown as StatementListItem[];
}

/**
 * Browse newest statements
 */
export async function browseStatementsByNewest(
  machinery: SDKMachinery,
  options: BrowseStatementsOptions = {}
): Promise<StatementListItem[]> {
  const { limit = 10, offset = 0, orderDirection = 'desc' } = options;

  const result = await executeTypedGraphQLQuery(machinery, BrowseByNewestDocument, {
    limit,
    offset,
    orderDirection,
  });
  return ((result.statementss?.items ?? []) as unknown as Array<{ cidV1: string }>).map((item) => ({ ...item, id: item.cidV1, cid: item.cidV1 })) as unknown as StatementListItem[];
}

/**
 * Browse newest statements
 */
export async function browseStatements(
  machinery: SDKMachinery,
  options: BrowseStatementsOptions = {}
): Promise<StatementListItem[]> {
  const { limit = 10, offset = 0, orderBy = 'createdAt', orderDirection = 'desc' } = options;

  const result = await executeTypedGraphQLQuery(machinery, BrowseStatementsDocument, {
    limit,
    offset,
    orderBy,
    orderDirection,
  });
  return ((result.statementss?.items ?? []) as unknown as Array<{ cidV1: string }>).map((item) => ({ ...item, id: item.cidV1, cid: item.cidV1 })) as unknown as StatementListItem[];
}

/**
 * Get all statements (for basic listing)
 */
export async function getAllStatements(
  machinery: SDKMachinery,
  options: BrowseStatementsOptions = {}
): Promise<StatementListItem[]> {
  const { limit = 100, offset = 0 } = options;

  const result = await executeTypedGraphQLQuery(machinery, GetAllStatementsDocument, {
    limit,
    offset,
  });
  return ((result.statementss?.items ?? []) as unknown as Array<{ cidV1: string }>).map((item) => ({ ...item, id: item.cidV1, cid: item.cidV1 })) as unknown as StatementListItem[];
}

/**
 * Get statements a user directly believes
 */
export async function getUserBeliefs(
  machinery: SDKMachinery,
  userAddress: string
): Promise<StatementListItem[]> {
  const result = await executeTypedGraphQLQuery(machinery, GetUserBeliefsDocument, {
    user: userAddress.toLowerCase(),
  });

  return (result.users?.beliefs?.items.map(item => {
    const s = item.statement as unknown as { cidV1: string } | null | undefined;
    if (!s) return s;
    return { ...s, id: s.cidV1, cid: s.cidV1 };
  }) ?? []) as unknown as StatementListItem[];
}

/**
 * Get statements a user directly disbelieves
 */
export async function getUserDisbeliefs(
  machinery: SDKMachinery,
  userAddress: string
): Promise<StatementListItem[]> {
  const result = await executeTypedGraphQLQuery(machinery, GetUserDisbeliefsDocument, {
    user: userAddress.toLowerCase(),
  });

  return (result.users?.beliefs?.items.map(item => {
    const s = item.statement as unknown as { cidV1: string } | null | undefined;
    if (!s) return s;
    return { ...s, id: s.cidV1, cid: s.cidV1 };
  }) ?? []) as unknown as StatementListItem[];
}

/**
 * Get statement suggestions for a given statement
 * Returns statements that:
 * 1. Are implied by this statement (S1 -> S2) and S2 is more popular
 * 2. Imply this statement (S2 -> S1) and S2 is more popular
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
 * This is a complex function that combines GraphQL queries with IPFS fetching.
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
 *
 * This function solves the N+1 query pattern by efficiently computing all of a user's
 * indirect support in a single operation, rather than querying each believed statement
 * separately.
 *
 * A user indirectly supports a statement if:
 * 1. They believe some statement A
 * 2. There exists an implication A -> B (attested by a trusted attester)
 * 3. They have NO explicit opinion on statement B (not belief, not disbelief)
 *
 * Note: Indirect support only applies to statements the user hasn't directly opined on.
 * If they directly believe or disbelieve a statement, it's not considered indirect support.
 */
export async function getUserIndirectSupport(
  machinery: SDKMachinery,
  userAddress: string,
  options: GetUserIndirectSupportOptions = {}
): Promise<IndirectSupportInfo[]> {
  const userBeliefs = await getUserBeliefs(machinery, userAddress);

  if (userBeliefs.length === 0) {
    return [];
  }

  const implicationsQueries = userBeliefs.map(belief =>
    getImplicationsFrom(machinery, belief.cid, options.trustedAttesters?.[0])
  );

  const implicationsResults = await Promise.all(implicationsQueries);

  const targetToSources = new Map<IpfsCidV1, Set<IpfsCidV1>>();
  const allTargetStatementCids = new Set<IpfsCidV1>();

  userBeliefs.forEach((belief, idx) => {
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
    // Target statements only referenced in implications (not in statementsRegistry) return null.
    // Use a minimal placeholder so we still include them in indirect support results.
    const statement = statements[i] ?? {
      id: targetCid,
      cid: targetCid,
      believerCount: 0,
      disbelieverCount: 0,
      createdAt: '',
    } as unknown as Statement;

    const sourceIds = Array.from(targetToSources.get(targetCid) || []);
    const sourceStatements = userBeliefs.filter(b => sourceIds.includes(b.cid));

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

// ============================================================================
// Social Data Queries
// ============================================================================

/**
 * Get social data (ENS name, Twitter info) for a user address.
 * Uses the GraphQL API auto-generated from the user_social_data table.
 */
export async function getUserSocialData(
  machinery: SDKMachinery,
  address: string
): Promise<UserSocialData | null> {
  const result = await executeTypedGraphQLQuery(machinery, GetUserSocialDataDocument, {
    address: address.toLowerCase(),
  });
  return (result.userSocialData as unknown as UserSocialData) ?? null;
}

/**
 * Get high-profile signers for a statement.
 * Uses the REST endpoint since it involves a join between beliefs and social data.
 */
export async function getHighProfileSigners(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  options: { minFollowers?: number; limit?: number } = {}
): Promise<HighProfileSigner[]> {
  const { minFollowers = 10000, limit = 10 } = options;
  const params = new URLSearchParams({
    minFollowers: String(minFollowers),
    limit: String(limit),
  });

  const url = `${machinery.indexerUrl.replace(/\/graphql$/, '')}/conceptspace/api/high-profile-signers/${statementCid}?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    console.warn(`Failed to fetch high-profile signers: ${response.status}`);
    return [];
  }

  const data: { signers?: HighProfileSigner[] } = await response.json();
  return data.signers ?? [];
}
