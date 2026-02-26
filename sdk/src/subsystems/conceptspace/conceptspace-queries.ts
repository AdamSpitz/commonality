/**
 * GraphQL queries for Conceptspace subsystem
 */

import { fetchFromIPFS } from '../../actions/common.js';
import { request } from 'graphql-request';
import {
  GetStatementDocument,
  GetUserBeliefDocument,
  GetImplicationsFromDocument,
  GetImplicationsToDocument,
  GetImplicationDocument,
  GetBelieversForStatementDocument,
  BrowseByMostSupportersDocument,
  BrowseByNewestDocument,
  BrowseStatementsDocument,
  GetAllStatementsDocument,
  GetUserBeliefsDocument,
  GetUserDisbeliefsDocument,
} from '../../generated/graphql.js';
import {
  type Statement,
  type UserBelief,
  type IndirectSupporter,
  type StatementListItem,
  type BrowseStatementsOptions,
} from './types.js';
import { type DisplayableDocument } from '../../displayable-document.js';
import { IpfsCidV1, normalizeCidV1 } from '../../cid-types.js';
import { SDKMachinery } from '../../machinery.js';

// ============================================================================
// Type Definitions
// ============================================================================

export interface Implication {
  attester: string;
  fromStatementCid: IpfsCidV1;
  toStatementCid: IpfsCidV1;
  explanationCid: IpfsCidV1;
  createdAt: string;
  blockNumber: string;
}

export interface StatementWithContent {
  statement: Statement;
  content: DisplayableDocument | null;
  metrics?: {
    directBelievers: number;
    directDisbelievers: number;
    indirectSupporters: number;
  };
}

export interface GetStatementWithContentOptions {
  includeMetrics?: boolean;
  timeout?: number;
  attesterAddress?: string;
}

export interface IndirectSupportInfo {
  statement: StatementListItem;
  supportedVia: Array<{
    directlyBelievedStatement: StatementListItem;
    viaStatementCid: IpfsCidV1;
  }>;
}

export interface GetUserIndirectSupportOptions {
  trustedAttesters?: string[];
  limit?: number;
  offset?: number;
}

export interface StatementSuggestion {
  statement: StatementListItem;
  reason: string;
  relationshipType: string;
}


// ============================================================================
// Conceptspace Queries
// ============================================================================

/**
 * Get statement by ID
 */
export async function getStatement(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1
): Promise<Statement | null> {
  const result = await request(machinery.graphqlClient.url, GetStatementDocument, {
    id: statementCid,
  });
  // BigInt fields (createdAt) come as strings at runtime
  // Map cidV1 (ponder primary key) back to id and cid (SDK convention)
  const raw = result.statements as unknown as { cidV1: string } | null | undefined;
  if (!raw) return null;
  return { ...raw, id: raw.cidV1, cid: raw.cidV1 } as unknown as Statement;
}

/**
 * Get user's belief about a statement
 */
export async function getUserBelief(
  machinery: SDKMachinery,
  userAddress: string,
  statementCid: IpfsCidV1
): Promise<UserBelief | null> {
  const result = await request(machinery.graphqlClient.url, GetUserBeliefDocument, {
    user: userAddress.toLowerCase(),
    statementId: statementCid,
  });
  return result.beliefs as unknown as UserBelief | null;
}

// ============================================================================
// Implications Queries
// ============================================================================

function normalizeAttester(attester: string | { id: string } | undefined): string {
  if (!attester) return '';
  if (typeof attester === 'string') return attester;
  return attester.id;
}

type RawImplication = {
  fromStatementCid: string;
  toStatementCid: string;
  createdAt: bigint | string;
  blockNumber: bigint | string;
  explanationCid?: string;
  attester?: string | { id: string };
};

function normalizeImplication(imp: RawImplication): Implication {
  return {
    ...imp,
    attester: normalizeAttester(imp.attester),
  } as unknown as Implication;
}

/**
 * Get implications from a statement (what it implies)
 */
export async function getImplicationsFrom(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  attesterAddress?: string
): Promise<Implication[]> {
  const variables: { fromStatementCid: string; attester?: string } = {
    fromStatementCid: statementCid,
  };
  if (attesterAddress) {
    variables.attester = attesterAddress.toLowerCase();
  }
  const result = await request(machinery.graphqlClient.url, GetImplicationsFromDocument, variables);
  // GraphQL returns attester as { id: "0x..." }, normalize to string
  return (result.implicationss?.items ?? []).map(normalizeImplication) as Implication[];
}

/**
 * Get implications to a statement (what implies it)
 */
export async function getImplicationsTo(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  attesterAddress?: string
): Promise<Implication[]> {
  const variables: { toStatementCid: string; attester?: string } = {
    toStatementCid: statementCid,
  };
  if (attesterAddress) {
    variables.attester = attesterAddress.toLowerCase();
  }
  const result = await request(machinery.graphqlClient.url, GetImplicationsToDocument, variables);
  // GraphQL returns attester as { id: "0x..." }, normalize to string
  return (result.implicationss?.items ?? []).map(normalizeImplication) as Implication[];
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
  const result = await request(machinery.graphqlClient.url, GetImplicationDocument, {
    attester: attesterAddress.toLowerCase(),
    fromStatementCid: fromStatementCid,
    toStatementCid: toStatementCid,
  });
  // GraphQL returns attester as { id: "0x..." }, normalize to string
  return result.implications ? normalizeImplication(result.implications) : null;
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
  // Step 1: Get all implications pointing to this statement
  const implications = await getImplicationsTo(machinery, statementCid, attesterAddress);
  if (implications.length === 0) {
    return [];
  }

  // Step 2: Fetch believers for all implications in parallel
  const believersQueries = implications.map(implication =>
    request(machinery.graphqlClient.url, GetBelieversForStatementDocument, {
      statementId: implication.fromStatementCid.toLowerCase(),
    })
  );

  const believersResults = await Promise.all(believersQueries);

  // Step 3: Collect all unique user addresses and their source statements
  const userToViaStatement = new Map<string, IpfsCidV1>();

  implications.forEach((implication, idx) => {
    const believers = (believersResults[idx].beliefss?.items ?? []) as Array<{ user: { id: string }; beliefState: number }>;
    believers.forEach(believer => {
      const userAddress = believer.user.id;
      // Store the first statement that led to this indirect support
      if (!userToViaStatement.has(userAddress)) {
        userToViaStatement.set(userAddress, implication.fromStatementCid);
      }
    });
  });

  // Step 4: Check all users' beliefs on target statement in parallel
  const uniqueUsers = Array.from(userToViaStatement.keys());
  const targetBeliefQueries = uniqueUsers.map(userAddress =>
    getUserBelief(machinery, userAddress, statementCid)
  );

  const targetBeliefs = await Promise.all(targetBeliefQueries);

  // Step 5: Filter out users who explicitly disbelieve the target
  const supporters: IndirectSupporter[] = [];

  uniqueUsers.forEach((userAddress, idx) => {
    const targetBelief = targetBeliefs[idx];
    // Only include if they don't explicitly disbelieve (beliefState 2 = disbelieve)
    if (!targetBelief || targetBelief.beliefState !== 2) {
      supporters.push({
        user: userAddress,
        viaStatementCid: userToViaStatement.get(userAddress)!,
      });
    }
  });

  return supporters;
}

/**
 * Get count of indirect supporters for a statement.
 * More efficient than getIndirectSupporters when you only need the count.
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
// Statement Discovery & Browsing Queries
// ============================================================================

/**
 * Browse statements by most supporters (direct believers)
 */
export async function browseStatementsByMostSupporters(
  machinery: SDKMachinery,
  options: BrowseStatementsOptions = {}
): Promise<StatementListItem[]> {
  const { limit = 10, offset = 0, orderDirection = 'desc' } = options;

  const result = await request(machinery.graphqlClient.url, BrowseByMostSupportersDocument, {
    limit,
    offset,
    orderDirection,
  });
  // BigInt fields (createdAt) come as strings at runtime
  // Map cidV1 (ponder primary key) back to id and cid (SDK convention)
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

  const result = await request(machinery.graphqlClient.url, BrowseByNewestDocument, {
    limit,
    offset,
    orderDirection,
  });
  // BigInt fields (createdAt) come as strings at runtime
  // Map cidV1 (ponder primary key) back to id and cid (SDK convention)
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

  const result = await request(machinery.graphqlClient.url, BrowseStatementsDocument, {
    limit,
    offset,
    orderBy,
    orderDirection,
  });
  // BigInt fields (createdAt) come as strings at runtime
  // Map cidV1 (ponder primary key) back to id and cid (SDK convention)
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

  const result = await request(machinery.graphqlClient.url, GetAllStatementsDocument, {
    limit,
    offset,
  });
  // BigInt fields (createdAt) come as strings at runtime
  // Map cidV1 (ponder primary key) back to id and cid (SDK convention)
  return ((result.statementss?.items ?? []) as unknown as Array<{ cidV1: string }>).map((item) => ({ ...item, id: item.cidV1, cid: item.cidV1 })) as unknown as StatementListItem[];
}

/**
 * Get statements a user directly believes
 */
export async function getUserBeliefs(
  machinery: SDKMachinery,
  userAddress: string
): Promise<StatementListItem[]> {
  const result = await request(machinery.graphqlClient.url, GetUserBeliefsDocument, {
    user: userAddress.toLowerCase(),
  });

  // Map cidV1 (ponder primary key) back to id and cid (SDK convention)
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
  const result = await request(machinery.graphqlClient.url, GetUserDisbeliefsDocument, {
    user: userAddress.toLowerCase(),
  });

  // Map cidV1 (ponder primary key) back to id and cid (SDK convention)
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

  // Get the source statement to compare popularity
  const sourceStatement = await getStatement(machinery, statementCid);
  if (!sourceStatement) {
    return [];
  }

  // Get implications from this statement (S1 -> S2)
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

  // Get implications to this statement (S2 -> S1)
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

  // Sort by popularity (most supporters first)
  suggestions.sort((a, b) => b.statement.believerCount - a.statement.believerCount);

  return suggestions;
}

// ============================================================================
// Composite Functions
// ============================================================================

export interface StatementWithContent {
  statement: Statement;
  content: DisplayableDocument | null;
  metrics?: {
    directBelievers: number;
    directDisbelievers: number;
    indirectSupporters: number;
  };
}

export interface GetStatementWithContentOptions {
  includeMetrics?: boolean;
  timeout?: number;
  attesterAddress?: string;
}

export interface IndirectSupportInfo {
  statement: StatementListItem;
  supportedVia: Array<{
    directlyBelievedStatement: StatementListItem;
    viaStatementCid: IpfsCidV1;
  }>;
}

export interface GetUserIndirectSupportOptions {
  trustedAttesters?: string[];
  limit?: number;
  offset?: number;
}

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
    content = await fetchFromIPFS(statement.cid, timeout) as DisplayableDocument | null;
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
    const statement = statements[i];

    if (!statement) continue;

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
