/**
 * GraphQL queries for integration tests
 *
 * This module provides functions to query the Ponder indexer's GraphQL API
 */

export interface GraphQLClient {
  url: string;
}

/**
 * Assert that a value is not null/undefined, throwing a descriptive error if it is
 */
export function assertNotNull<T>(value: T | null | undefined, description: string): T {
  if (value === null || value === undefined) {
    throw new Error(`${description} not found in indexer`);
  }
  return value;
}

/**
 * Create a GraphQL client
 */
export function createGraphQLClient(url = 'http://localhost:42069/graphql'): GraphQLClient {
  return { url };
}

/**
 * Execute a GraphQL query
 */
export async function query<T = any>(
  client: GraphQLClient,
  queryString: string,
  variables?: Record<string, any>
): Promise<T> {
  const response = await fetch(client.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: queryString,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data as T;
}

// ============================================================================
// Conceptspace Queries
// ============================================================================

export interface Statement {
  id: string;
  believerCount: number;
  disbelieverCount: number;
}

/**
 * Get statement by ID
 */
export async function getStatement(
  client: GraphQLClient,
  statementId: string
): Promise<Statement | null> {
  const result = await query<{ statements: Statement | null }>(
    client,
    `
      query GetStatement($id: String!) {
        statements(id: $id) {
          id
          believerCount
          disbelieverCount
        }
      }
    `,
    { id: statementId.toLowerCase() }
  );

  return result.statements;
}

export interface UserBelief {
  statementId: string;
  beliefState: number; // 0=noOpinion, 1=believes, 2=disbelieves
}

/**
 * Get user's belief about a statement
 */
export async function getUserBelief(
  client: GraphQLClient,
  userAddress: string,
  statementId: string
): Promise<UserBelief | null> {
  const result = await query<{ beliefs: UserBelief | null }>(
    client,
    `
      query GetUserBelief($user: String!, $statementId: String!) {
        beliefs(user: $user, statementId: $statementId) {
          statementId
          beliefState
        }
      }
    `,
    { user: userAddress.toLowerCase(), statementId: statementId.toLowerCase() }
  );

  return result.beliefs;
}

// ============================================================================
// Implications Queries
// ============================================================================

export interface Implication {
  attester: { id: string };
  fromStatementId: string;
  toStatementId: string;
  createdAt: string;
  blockNumber: string;
}

/**
 * Get implications from a statement (what it implies)
 */
export async function getImplicationsFrom(
  client: GraphQLClient,
  statementId: string,
  attesterAddress?: string
): Promise<Implication[]> {
  if (attesterAddress) {
    const result = await query<{ implicationss: { items: Implication[] } }>(
      client,
      `
        query GetImplicationsFrom($fromStatementId: String!, $attester: String!) {
          implicationss(where: { fromStatementId: $fromStatementId, attester: $attester }) {
            items {
              attester {
                id
              }
              fromStatementId
              toStatementId
              createdAt
              blockNumber
            }
          }
        }
      `,
      { fromStatementId: statementId.toLowerCase(), attester: attesterAddress.toLowerCase() }
    );
    return result.implicationss?.items || [];
  } else {
    const result = await query<{ implicationss: { items: Implication[] } }>(
      client,
      `
        query GetImplicationsFrom($fromStatementId: String!) {
          implicationss(where: { fromStatementId: $fromStatementId }) {
            items {
              attester {
                id
              }
              fromStatementId
              toStatementId
              createdAt
              blockNumber
            }
          }
        }
      `,
      { fromStatementId: statementId.toLowerCase() }
    );
    return result.implicationss?.items || [];
  }
}

/**
 * Get implications to a statement (what implies it)
 */
export async function getImplicationsTo(
  client: GraphQLClient,
  statementId: string,
  attesterAddress?: string
): Promise<Implication[]> {
  if (attesterAddress) {
    const result = await query<{ implicationss: { items: Implication[] } }>(
      client,
      `
        query GetImplicationsTo($toStatementId: String!, $attester: String!) {
          implicationss(where: { toStatementId: $toStatementId, attester: $attester }) {
            items {
              attester {
                id
              }
              fromStatementId
              toStatementId
              createdAt
              blockNumber
            }
          }
        }
      `,
      { toStatementId: statementId.toLowerCase(), attester: attesterAddress.toLowerCase() }
    );
    return result.implicationss?.items || [];
  } else {
    const result = await query<{ implicationss: { items: Implication[] } }>(
      client,
      `
        query GetImplicationsTo($toStatementId: String!) {
          implicationss(where: { toStatementId: $toStatementId }) {
            items {
              attester {
                id
              }
              fromStatementId
              toStatementId
              createdAt
              blockNumber
            }
          }
        }
      `,
      { toStatementId: statementId.toLowerCase() }
    );
    return result.implicationss?.items || [];
  }
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
  const result = await query<{ implications: Implication | null }>(
    client,
    `
      query GetImplication($attester: String!, $fromStatementId: String!, $toStatementId: String!) {
        implications(
          attester: $attester,
          fromStatementId: $fromStatementId,
          toStatementId: $toStatementId
        ) {
          attester {
            id
          }
          fromStatementId
          toStatementId
          createdAt
          blockNumber
        }
      }
    `,
    {
      attester: attesterAddress.toLowerCase(),
      fromStatementId: fromStatementId.toLowerCase(),
      toStatementId: toStatementId.toLowerCase()
    }
  );

  return result.implications;
}

// ============================================================================
// Ponder Sync Status
// ============================================================================

export interface IndexerStatus {
  currentBlock: number;
  targetBlock: number;
  isHealthy: boolean;
}

/**
 * Wait for the indexer to sync to a specific block
 */
export async function waitForSync(
  client: GraphQLClient,
  targetBlock: bigint,
  timeoutMs = 10000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      // Ponder exposes indexing status via a meta query
      // The status is a JSON object with chain-specific block info
      const result = await query<{
        _meta: {
          status: Record<string, { block: { number: number } }>
        }
      }>(
        client,
        `
          query {
            _meta {
              status
            }
          }
        `
      );

      // Get the block number from the hardhat chain status
      const hardhatStatus = result._meta.status.hardhat;
      if (!hardhatStatus) {
        throw new Error('No hardhat chain status found');
      }

      const currentBlock = hardhatStatus.block.number;

      if (currentBlock >= Number(targetBlock)) {
        return;
      }

      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      // Indexer might not be ready yet, wait and retry
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  throw new Error(`Indexer did not sync to block ${targetBlock} within ${timeoutMs}ms`);
}

// ============================================================================
// Pubstarter Queries
// ============================================================================

export interface Project {
  id: string;
  erc1155Address: string;
  recipient: string;
  threshold: string;
  deadline: string;
  totalReceived: string;
  metadataCid?: string;
}

export interface ProjectToken {
  id: string;
  projectId: string;
  tokenId: string;
  price: string;
  totalSupply: string;
}

export interface Contribution {
  id: string;
  contributor: string;
  projectId: string;
  tokenId: string;
  amount: string;
  totalCost: string;
  timestamp: string;
}

/**
 * Get project by assurance contract address (which is the project id)
 */
export async function getProject(
  client: GraphQLClient,
  assuranceContractAddress: string
): Promise<Project | null> {
  const result = await query<{ projects: Project | null }>(
    client,
    `
      query GetProject($id: String!) {
        projects(id: $id) {
          id
          erc1155Address
          recipient
          threshold
          deadline
          totalReceived
          metadataCid
        }
      }
    `,
    { id: assuranceContractAddress.toLowerCase() }
  );

  return result.projects;
}

/**
 * Get all projects
 */
export async function getAllProjects(
  client: GraphQLClient
): Promise<Project[]> {
  const result = await query<{ projectss: { items: Project[] } }>(
    client,
    `
      query GetAllProjects {
        projectss {
          items {
            id
            erc1155Address
            recipient
            threshold
            deadline
            totalReceived
            metadataCid
          }
        }
      }
    `
  );

  return result.projectss?.items || [];
}

/**
 * Get project tokens for a project
 */
export async function getProjectTokens(
  client: GraphQLClient,
  assuranceContractAddress: string
): Promise<ProjectToken[]> {
  const result = await query<{ projectTokenss: { items: ProjectToken[] } }>(
    client,
    `
      query GetProjectTokens($projectId: String!) {
        projectTokenss(where: { projectId: $projectId }) {
          items {
            id
            projectId
            tokenId
            price
            totalSupply
          }
        }
      }
    `,
    { projectId: assuranceContractAddress.toLowerCase() }
  );

  return result.projectTokenss?.items || [];
}

/**
 * Get contributions for a project
 */
export async function getProjectContributions(
  client: GraphQLClient,
  assuranceContractAddress: string
): Promise<Contribution[]> {
  const result = await query<{ contributionss: { items: Contribution[] } }>(
    client,
    `
      query GetProjectContributions($projectId: String!) {
        contributionss(where: { projectId: $projectId }) {
          items {
            id
            contributor
            projectId
            tokenId
            amount
            totalCost
            timestamp
          }
        }
      }
    `,
    { projectId: assuranceContractAddress.toLowerCase() }
  );

  return result.contributionss?.items || [];
}

/**
 * Get contributions by a specific user
 */
export async function getUserContributions(
  client: GraphQLClient,
  userAddress: string
): Promise<Contribution[]> {
  const result = await query<{ contributionss: { items: Contribution[] } }>(
    client,
    `
      query GetUserContributions($contributor: String!) {
        contributionss(where: { contributor: $contributor }) {
          items {
            id
            contributor
            projectId
            tokenId
            amount
            totalCost
            timestamp
          }
        }
      }
    `,
    { contributor: userAddress.toLowerCase() }
  );

  return result.contributionss?.items || [];
}
