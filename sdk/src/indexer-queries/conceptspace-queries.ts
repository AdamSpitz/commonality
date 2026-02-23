/**
 * GraphQL queries for Conceptspace subsystem
 */

import { request } from 'graphql-request';
import { type GraphQLClient } from '../utils/graphqlClient.js';
import {
  GetStatementDocument,
  GetUserBeliefDocument,
  GetImplicationsFromDocument,
  GetImplicationsToDocument,
  GetImplicationDocument,
  GetBelieversForStatementDocument,
  BrowseByMostSupportersDocument,
  BrowseByNewestDocument,
  GetAllStatementsDocument,
  GetUserBeliefsDocument,
  GetUserDisbeliefsDocument,
} from '../generated/graphql.js';
import {
  type Statement,
  type UserBelief,
  type Implication,
  type IndirectSupporter,
  type StatementListItem,
  type BrowseStatementsOptions,
} from '../shared/types/conceptspace.js';
import { bytes32ToCid } from '../cid-types.js';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert a statement ID from hex format (0x...) to CIDv1 format (bafy...)
 * for indexer queries. If already in CIDv1 format, returns as-is.
 */
function normalizeStatementId(statementId: string): string {
  if (statementId.startsWith('0x') && statementId.length === 66) {
    return bytes32ToCid(statementId as `0x${string}`);
  }
  return statementId;
}

// ============================================================================
// Conceptspace Queries
// ============================================================================

/**
 * Get statement by ID
 */
export async function getStatement(
  client: GraphQLClient,
  statementId: string
): Promise<Statement | null> {
  const normalizedId = normalizeStatementId(statementId);
  const result = await request(client.url, GetStatementDocument, {
    id: normalizedId.toLowerCase(),
  });
  // BigInt fields (createdAt) come as strings at runtime
  // Map cidV1 (ponder primary key) back to id and cid (SDK convention)
  const raw = result.statements as any;
  if (!raw) return null;
  return { ...raw, id: raw.cidV1, cid: raw.cidV1 } as unknown as Statement;
}

/**
 * Get user's belief about a statement
 */
export async function getUserBelief(
  client: GraphQLClient,
  userAddress: string,
  statementId: string
): Promise<UserBelief | null> {
  const normalizedStatementId = normalizeStatementId(statementId);
  const result = await request(client.url, GetUserBeliefDocument, {
    user: userAddress.toLowerCase(),
    statementId: normalizedStatementId.toLowerCase(),
  });
  return result.beliefs as unknown as UserBelief | null;
}

// ============================================================================
// Implications Queries
// ============================================================================

/**
 * Get implications from a statement (what it implies)
 */
export async function getImplicationsFrom(
  client: GraphQLClient,
  statementId: string,
  attesterAddress?: string
): Promise<Implication[]> {
  const normalizedStatementId = normalizeStatementId(statementId);
  const result = await request(client.url, GetImplicationsFromDocument, {
    fromStatementId: normalizedStatementId.toLowerCase(),
    attester: attesterAddress?.toLowerCase() ?? null,
  });
  // explanationCid is not in schema; BigInt fields come as strings at runtime
  return (result.implicationss?.items ?? []) as unknown as Implication[];
}

/**
 * Get implications to a statement (what implies it)
 */
export async function getImplicationsTo(
  client: GraphQLClient,
  statementId: string,
  attesterAddress?: string
): Promise<Implication[]> {
  const normalizedStatementId = normalizeStatementId(statementId);
  const result = await request(client.url, GetImplicationsToDocument, {
    toStatementId: normalizedStatementId.toLowerCase(),
    attester: attesterAddress?.toLowerCase() ?? null,
  });
  // explanationCid is not in schema; BigInt fields come as strings at runtime
  return (result.implicationss?.items ?? []) as unknown as Implication[];
}

/**
 * Get a specific implication attestation
 */
export async function getImplication(
  client: GraphQLClient,
  attesterAddress: string,
  fromStatementId: string,
  toStatementId: string
): Promise<Implication | null> {
  const normalizedFromStatementId = normalizeStatementId(fromStatementId);
  const normalizedToStatementId = normalizeStatementId(toStatementId);
  const result = await request(client.url, GetImplicationDocument, {
    attester: attesterAddress.toLowerCase(),
    fromStatementId: normalizedFromStatementId.toLowerCase(),
    toStatementId: normalizedToStatementId.toLowerCase(),
  });
  // explanationCid is not in schema; BigInt fields come as strings at runtime
  return result.implications as unknown as Implication | null;
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
  client: GraphQLClient,
  statementId: string,
  attesterAddress?: string
): Promise<IndirectSupporter[]> {
  // Step 1: Get all implications pointing to this statement
  const implications = await getImplicationsTo(client, statementId, attesterAddress);

  if (implications.length === 0) {
    return [];
  }

  // Step 2: Fetch believers for all implications in parallel
  const believersQueries = implications.map(implication =>
    request(client.url, GetBelieversForStatementDocument, {
      statementId: implication.fromStatementId.toLowerCase(),
    })
  );

  const believersResults = await Promise.all(believersQueries);

  // Step 3: Collect all unique user addresses and their source statements
  const userToViaStatement = new Map<string, string>();

  implications.forEach((implication, idx) => {
    const believers = (believersResults[idx].beliefss?.items ?? []) as Array<{ user: { id: string }; beliefState: number }>;
    believers.forEach(believer => {
      const userAddress = believer.user.id;
      // Store the first statement that led to this indirect support
      if (!userToViaStatement.has(userAddress)) {
        userToViaStatement.set(userAddress, implication.fromStatementId);
      }
    });
  });

  // Step 4: Check all users' beliefs on target statement in parallel
  const uniqueUsers = Array.from(userToViaStatement.keys());
  const targetBeliefQueries = uniqueUsers.map(userAddress =>
    getUserBelief(client, userAddress, statementId)
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
        viaStatementId: userToViaStatement.get(userAddress)!,
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
  client: GraphQLClient,
  statementId: string,
  attesterAddress?: string
): Promise<number> {
  const supporters = await getIndirectSupporters(client, statementId, attesterAddress);
  return supporters.length;
}

// ============================================================================
// Statement Discovery & Browsing Queries
// ============================================================================

/**
 * Browse statements by most supporters (direct believers)
 */
export async function browseStatementsByMostSupporters(
  client: GraphQLClient,
  options: BrowseStatementsOptions = {}
): Promise<StatementListItem[]> {
  const { limit = 10, offset = 0, orderDirection = 'desc' } = options;

  const result = await request(client.url, BrowseByMostSupportersDocument, {
    limit,
    offset,
    orderDirection,
  });
  // BigInt fields (createdAt) come as strings at runtime
  // Map cidV1 (ponder primary key) back to id and cid (SDK convention)
  return (result.statementss?.items ?? []).map((item: any) => ({ ...item, id: item.cidV1, cid: item.cidV1 })) as unknown as StatementListItem[];
}

/**
 * Browse newest statements
 */
export async function browseStatementsByNewest(
  client: GraphQLClient,
  options: BrowseStatementsOptions = {}
): Promise<StatementListItem[]> {
  const { limit = 10, offset = 0, orderDirection = 'desc' } = options;

  const result = await request(client.url, BrowseByNewestDocument, {
    limit,
    offset,
    orderDirection,
  });
  // BigInt fields (createdAt) come as strings at runtime
  // Map cidV1 (ponder primary key) back to id and cid (SDK convention)
  return (result.statementss?.items ?? []).map((item: any) => ({ ...item, id: item.cidV1, cid: item.cidV1 })) as unknown as StatementListItem[];
}

/**
 * Get all statements (for basic listing)
 */
export async function getAllStatements(
  client: GraphQLClient,
  options: BrowseStatementsOptions = {}
): Promise<StatementListItem[]> {
  const { limit = 100, offset = 0 } = options;

  const result = await request(client.url, GetAllStatementsDocument, {
    limit,
    offset,
  });
  // BigInt fields (createdAt) come as strings at runtime
  // Map cidV1 (ponder primary key) back to id and cid (SDK convention)
  return (result.statementss?.items ?? []).map((item: any) => ({ ...item, id: item.cidV1, cid: item.cidV1 })) as unknown as StatementListItem[];
}

/**
 * Get statements a user directly believes
 */
export async function getUserBeliefs(
  client: GraphQLClient,
  userAddress: string
): Promise<StatementListItem[]> {
  const result = await request(client.url, GetUserBeliefsDocument, {
    user: userAddress.toLowerCase(),
  });

  // Map cidV1 (ponder primary key) back to id and cid (SDK convention)
  return (result.users?.beliefs?.items.map(item => {
    const s = item.statement as any;
    if (!s) return s;
    return { ...s, id: s.cidV1, cid: s.cidV1 };
  }) ?? []) as unknown as StatementListItem[];
}

/**
 * Get statements a user directly disbelieves
 */
export async function getUserDisbeliefs(
  client: GraphQLClient,
  userAddress: string
): Promise<StatementListItem[]> {
  const result = await request(client.url, GetUserDisbeliefsDocument, {
    user: userAddress.toLowerCase(),
  });

  // Map cidV1 (ponder primary key) back to id and cid (SDK convention)
  return (result.users?.beliefs?.items.map(item => {
    const s = item.statement as any;
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
  client: GraphQLClient,
  statementId: string,
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
  const sourceStatement = await getStatement(client, statementId);
  if (!sourceStatement) {
    return [];
  }

  // Get implications from this statement (S1 -> S2)
  const implicationsFrom = await getImplicationsFrom(client, statementId, attesterAddress);

  for (const implication of implicationsFrom) {
    const targetStatement = await getStatement(client, implication.toStatementId);
    if (targetStatement && targetStatement.believerCount > sourceStatement.believerCount) {
      suggestions.push({
        statement: {
          id: targetStatement.id,
          cid: targetStatement.cid ?? targetStatement.id,
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
  const implicationsTo = await getImplicationsTo(client, statementId, attesterAddress);

  for (const implication of implicationsTo) {
    const sourceOfImplication = await getStatement(client, implication.fromStatementId);
    if (sourceOfImplication && sourceOfImplication.believerCount > sourceStatement.believerCount) {
      suggestions.push({
        statement: {
          id: sourceOfImplication.id,
          cid: sourceOfImplication.cid ?? sourceOfImplication.id,
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
