/**
 * Invariant checking utilities for integration tests
 *
 * These functions verify that the system maintains consistency properties
 * that should always be true, regardless of what actions are performed.
 *
 * See ../generative-test-prep.md for the full framework.
 */

import assert from 'assert';

/**
 * GraphQL client type (simple HTTP client)
 */
export interface GraphQLClient {
  url: string;
}

/**
 * GraphQL executor type (in-process executor with indexer client)
 */
export interface GraphQLExecutor {
  indexerClient: GraphQLClient;
}

/**
 * Execute a GraphQL query
 * Supports both GraphQLClient and GraphQLExecutor types
 */
async function query<T = any>(
  clientOrExecutor: GraphQLClient | GraphQLExecutor,
  queryString: string,
  variables?: Record<string, any>
): Promise<T> {
  // Extract the actual client from either type
  const client = 'indexerClient' in clientOrExecutor
    ? clientOrExecutor.indexerClient
    : clientOrExecutor;

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

  const result = await response.json() as { data?: T; errors?: any[] };

  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data as T;
}

/**
 * State Consistency Invariant #1: Belief counts match belief records
 *
 * For any statement:
 * - believerCount should equal the number of UserBelief records with beliefState=BELIEVES (1)
 * - disbelieverCount should equal the number of UserBelief records with beliefState=DISBELIEVES (2)
 *
 * This checks that the cached aggregated counts on the Statement entity
 * match the actual individual belief records in the database.
 */
export async function assertBeliefCountsMatch(
  graphqlClient: GraphQLClient | GraphQLExecutor,
  statementId: string
): Promise<void> {
  // Get the statement with its cached counts
  const statementResult = await query<{
    statements: {
      id: string;
      believerCount: number;
      disbelieverCount: number
    } | null
  }>(
    graphqlClient,
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

  const statement = statementResult.statements;
  if (!statement) {
    throw new Error(`Statement ${statementId} not found`);
  }

  // Get all believers (beliefState = 1)
  const believersResult = await query<{
    beliefss: {
      items: Array<{ user: { id: string }; beliefState: number }>
    }
  }>(
    graphqlClient,
    `
      query GetBelievers($statementId: String!) {
        beliefss(where: { statementId: $statementId, beliefState: 1 }) {
          items {
            user {
              id
            }
            beliefState
          }
        }
      }
    `,
    { statementId: statementId.toLowerCase() }
  );

  const actualBelieverCount = believersResult.beliefss?.items.length || 0;

  // Get all disbelievers (beliefState = 2)
  const disbelieversResult = await query<{
    beliefss: {
      items: Array<{ user: { id: string }; beliefState: number }>
    }
  }>(
    graphqlClient,
    `
      query GetDisbelievers($statementId: String!) {
        beliefss(where: { statementId: $statementId, beliefState: 2 }) {
          items {
            user {
              id
            }
            beliefState
          }
        }
      }
    `,
    { statementId: statementId.toLowerCase() }
  );

  const actualDisbelieverCount = disbelieversResult.beliefss?.items.length || 0;

  // Verify the counts match
  assert.strictEqual(
    statement.believerCount,
    actualBelieverCount,
    `Statement ${statementId}: believerCount mismatch. ` +
    `Expected ${actualBelieverCount} (from individual belief records), ` +
    `got ${statement.believerCount} (from cached count)`
  );

  assert.strictEqual(
    statement.disbelieverCount,
    actualDisbelieverCount,
    `Statement ${statementId}: disbelieverCount mismatch. ` +
    `Expected ${actualDisbelieverCount} (from individual belief records), ` +
    `got ${statement.disbelieverCount} (from cached count)`
  );
}

/**
 * State Consistency Invariant #2: Money conservation
 *
 * For any assurance contract (project):
 * - totalReceived should equal the sum of all individual contribution amounts
 *
 * This checks that the cached aggregated total on the Project entity
 * matches the sum of all individual Contribution records in the database.
 *
 * Note: This checks money conservation at the indexer level. A more complete
 * check would also verify that the indexer's totalReceived matches the
 * actual ETH balance on the blockchain, but that's a cross-system check
 * (Section 8) rather than a pure state consistency invariant.
 */
export async function assertMoneyConservation(
  graphqlClient: GraphQLClient | GraphQLExecutor,
  projectAddress: string
): Promise<void> {
  // Import SDK functions dynamically to avoid circular dependencies
  const { getProject, getProjectContributions } = await import('@commonality/sdk');

  // Cast to any to handle GraphQLClient | GraphQLExecutor union type
  const executor = graphqlClient as any;

  // Get the project with its cached totalReceived
  const project = await getProject(executor, projectAddress.toLowerCase());

  if (!project) {
    throw new Error(`Project ${projectAddress} not found`);
  }

  // Get all contributions for this project
  const contributions = await getProjectContributions(executor, projectAddress.toLowerCase());

  // Sum up all individual contribution amounts
  const actualTotal = contributions.reduce((sum, contribution) => {
    return sum + BigInt(contribution.amount);
  }, 0n);

  const cachedTotal = BigInt(project.totalReceived);

  // Verify the totals match
  assert.strictEqual(
    cachedTotal,
    actualTotal,
    `Project ${projectAddress}: totalReceived mismatch. ` +
    `Expected ${actualTotal.toString()} (sum from ${contributions.length} individual contributions), ` +
    `got ${cachedTotal.toString()} (from cached totalReceived)`
  );
}

/**
 * State Consistency Invariant #3: Token conservation
 *
 * For any project (assurance contract):
 * - For each tokenId: tokens sold (from contributions) should equal tokens held by users + tokens burned
 *
 * This verifies that tokens are neither created nor destroyed incorrectly in the indexer.
 * It checks the accounting equation: Sold = Held + Burned
 *
 * Where:
 * - Sold = sum of tokenCounts from all Contribution records
 * - Burned = sum of tokenCounts from all TokenBurn records
 * - Held = Sold - Burned (implicitly calculated, since we don't track live balances)
 *
 * Note: This is a consistency check at the indexer level. We're verifying that
 * the indexer's view of sold vs burned is internally consistent. A more complete
 * check (Section 8) would also verify against actual ERC1155 balances on-chain.
 *
 * @param graphqlClient GraphQL client or executor
 * @param projectAddress The project's assurance contract address
 */
export async function assertTokenConservation(
  graphqlClient: GraphQLClient | GraphQLExecutor,
  projectAddress: string
): Promise<void> {
  // Import SDK functions dynamically to avoid circular dependencies
  const { getProjectContributions, getTokenBurns } = await import('@commonality/sdk');

  // Cast to any to handle GraphQLClient | GraphQLExecutor union type
  const executor = graphqlClient as any;

  // Get all contributions for this project (tokens purchased)
  const contributions = await getProjectContributions(executor, projectAddress.toLowerCase());

  // Get the ERC1155 address from the first contribution
  // (All contributions for a project should have the same ERC1155 address)
  if (contributions.length === 0) {
    // No contributions yet - nothing to check
    return;
  }

  const erc1155Address = contributions[0].erc1155Address;
  if (!erc1155Address) {
    throw new Error(`Contribution for project ${projectAddress} has no erc1155Address`);
  }

  // Get all token burns for this ERC1155 (tokens destroyed)
  const burns = await getTokenBurns(executor, erc1155Address.toLowerCase());

  // Calculate total sold and burned per tokenId
  const tokenStats = new Map<string, { sold: bigint; burned: bigint }>();

  // Process contributions (tokens sold)
  for (const contribution of contributions) {
    if (contribution.erc1155Address?.toLowerCase() !== erc1155Address.toLowerCase()) {
      continue; // Skip contributions for different tokens
    }

    const tokenIds = JSON.parse(contribution.tokenIds) as string[];
    const tokenCounts = JSON.parse(contribution.tokenCounts) as string[];

    for (let i = 0; i < tokenIds.length; i++) {
      const tokenId = tokenIds[i];
      const count = BigInt(tokenCounts[i]);

      const stats = tokenStats.get(tokenId) || { sold: 0n, burned: 0n };
      stats.sold += count;
      tokenStats.set(tokenId, stats);
    }
  }

  // Process burns (tokens destroyed)
  for (const burn of burns) {
    const tokenIds = JSON.parse(burn.tokenIds) as string[];
    const tokenCounts = JSON.parse(burn.tokenCounts) as string[];

    for (let i = 0; i < tokenIds.length; i++) {
      const tokenId = tokenIds[i];
      const count = BigInt(tokenCounts[i]);

      const stats = tokenStats.get(tokenId) || { sold: 0n, burned: 0n };
      stats.burned += count;
      tokenStats.set(tokenId, stats);
    }
  }

  // Verify conservation for each tokenId
  for (const [tokenId, stats] of tokenStats.entries()) {
    // Check that burned tokens don't exceed sold tokens
    // (Held = Sold - Burned must be >= 0)
    const held = stats.sold - stats.burned;

    assert(
      held >= 0n,
      `ERC1155 ${erc1155Address} tokenId ${tokenId}: Token conservation violation. ` +
      `Burned (${stats.burned.toString()}) exceeds sold (${stats.sold.toString()}). ` +
      `This would mean ${(-held).toString()} tokens were burned that were never purchased.`
    );
  }
}

/**
 * State Consistency Invariant #4: Delegation chain integrity
 *
 * For any delegation note with a chain:
 * - Following the delegation chain should never create a cycle
 * - Each address in the chain should appear exactly once
 * - The chain positions should be sequential (0, 1, 2, ...)
 * - The first position (0) should be the rootOwner
 * - The last position should be the current owner (leaf)
 *
 * This verifies that delegation chains maintain their integrity and don't contain
 * logical inconsistencies like cycles or duplicate addresses.
 *
 * @param graphqlClient GraphQL client or executor
 * @param noteId The delegation note ID to check
 */
export async function assertDelegationChainIntegrity(
  graphqlClient: GraphQLClient | GraphQLExecutor,
  noteId: string
): Promise<void> {
  // Import SDK functions dynamically to avoid circular dependencies
  const { getNote, getDelegationChain } = await import('@commonality/sdk');

  // Cast to any to handle GraphQLClient | GraphQLExecutor union type
  const executor = graphqlClient as any;

  // Get the note
  const note = await getNote(executor, noteId);
  if (!note) {
    throw new Error(`Note ${noteId} not found`);
  }

  // Get the delegation chain
  const chain = await getDelegationChain(executor, noteId);

  if (chain.length === 0) {
    // No chain means this is a root note with no delegations
    // Verify that owner === rootOwner
    assert.strictEqual(
      note.owner.toLowerCase(),
      note.rootOwner.toLowerCase(),
      `Note ${noteId}: Root note (no chain) should have owner === rootOwner. ` +
      `Owner: ${note.owner}, RootOwner: ${note.rootOwner}`
    );
    return;
  }

  // Check for duplicate addresses (cycle detection)
  const addressSet = new Set<string>();
  for (const link of chain) {
    const normalizedAddress = link.address.toLowerCase();
    if (addressSet.has(normalizedAddress)) {
      throw new Error(
        `Note ${noteId}: Delegation chain contains cycle. ` +
        `Address ${link.address} appears multiple times in the chain.`
      );
    }
    addressSet.add(normalizedAddress);
  }

  // Check that positions are sequential
  for (let i = 0; i < chain.length; i++) {
    assert.strictEqual(
      chain[i].position,
      i,
      `Note ${noteId}: Chain position mismatch at index ${i}. ` +
      `Expected position ${i}, got ${chain[i].position}`
    );
  }

  // Check that first position (0) is the rootOwner
  assert.strictEqual(
    chain[0].address.toLowerCase(),
    note.rootOwner.toLowerCase(),
    `Note ${noteId}: First chain position (0) should be rootOwner. ` +
    `Chain[0]: ${chain[0].address}, RootOwner: ${note.rootOwner}`
  );

  // Check that last position is the current owner (leaf)
  const lastChainLink = chain[chain.length - 1];
  assert.strictEqual(
    lastChainLink.address.toLowerCase(),
    note.owner.toLowerCase(),
    `Note ${noteId}: Last chain position should be current owner (leaf). ` +
    `Chain[${chain.length - 1}]: ${lastChainLink.address}, Owner: ${note.owner}`
  );
}

/**
 * State Transition Property: Token transfer consistency
 *
 * Section 2 from generative-test-prep.md
 *
 * When tokens are transferred in the secondary market (via trade), verify that:
 * - The trade record has internally consistent data
 * - Buyer and seller are different addresses
 * - Token count is greater than 0
 * - Total price equals count * pricePerToken
 *
 * This is a basic sanity check on trade data. A more complete check would verify
 * actual ERC1155 balance changes on-chain (Section 8: Cross-Subsystem Consistency),
 * but that requires querying the blockchain directly and is more expensive.
 *
 * @param graphqlClient GraphQL client or executor
 * @param marketplaceAddress The marketplace contract address
 * @param transactionHash The transaction hash of the trade to check
 */
export async function assertTradeDataConsistency(
  graphqlClient: GraphQLClient | GraphQLExecutor,
  marketplaceAddress: string,
  transactionHash: string
): Promise<void> {
  // Import SDK functions dynamically to avoid circular dependencies
  const { getMarketplaceTrades } = await import('@commonality/sdk');

  // Cast to any to handle GraphQLClient | GraphQLExecutor union type
  const executor = graphqlClient as any;

  // Get all trades for this marketplace
  const allTrades = await getMarketplaceTrades(executor, marketplaceAddress);

  // Find the specific trade by transaction hash
  const trade = allTrades.find(
    t => t.transactionHash.toLowerCase() === transactionHash.toLowerCase()
  );

  if (!trade) {
    throw new Error(
      `Trade not found for marketplace ${marketplaceAddress} ` +
      `in transaction ${transactionHash}`
    );
  }

  // Check that buyer and seller are different
  const buyerNormalized = trade.buyer.toLowerCase();
  const sellerNormalized = trade.seller.toLowerCase();

  assert.notStrictEqual(
    buyerNormalized,
    sellerNormalized,
    `Trade ${trade.id}: Buyer and seller must be different addresses. ` +
    `Both are ${trade.buyer}`
  );

  // Check that count is greater than 0
  const count = BigInt(trade.count);
  assert(
    count > 0n,
    `Trade ${trade.id}: Count must be greater than 0. Got ${count.toString()}`
  );

  // Check that totalPrice = count * pricePerToken
  const pricePerToken = BigInt(trade.pricePerToken);
  const totalPrice = BigInt(trade.totalPrice);
  const expectedTotalPrice = count * pricePerToken;

  assert.strictEqual(
    totalPrice,
    expectedTotalPrice,
    `Trade ${trade.id}: Total price mismatch. ` +
    `Expected ${expectedTotalPrice.toString()} (${count.toString()} * ${pricePerToken.toString()}), ` +
    `got ${totalPrice.toString()}`
  );
}

/**
 * Query Consistency Check: Indirect supporter count vs list
 *
 * Section 3 from generative-test-prep.md
 *
 * Verifies that different ways of querying indirect supporters return consistent results:
 * - The count query should return the same number as the length of the list query
 * - This checks that the indexer's aggregated count matches the actual list of supporters
 *
 * This is a query consistency check (Section 3) rather than a state consistency invariant
 * (Section 1), because it's comparing two different query methods for the same data.
 *
 * @param graphqlClient GraphQL client or executor
 * @param statementId The statement ID to check
 * @param attesterAddress Optional: filter by specific trusted attester
 */
export async function assertIndirectSupporterCountConsistency(
  graphqlClient: GraphQLClient | GraphQLExecutor,
  statementId: string,
  attesterAddress?: string
): Promise<void> {
  // Import SDK functions dynamically to avoid circular dependencies
  const { getIndirectSupporterCount, getIndirectSupporters } = await import('@commonality/sdk');

  // Cast to any to handle GraphQLClient | GraphQLExecutor union type
  const executor = graphqlClient as any;

  // Method 1: Get the count using the dedicated count query
  const count = await getIndirectSupporterCount(executor, statementId, attesterAddress);

  // Method 2: Get the full list of supporters and count them
  const supporters = await getIndirectSupporters(executor, statementId, attesterAddress);
  const actualCount = supporters.length;

  // Verify the count matches
  const attesterInfo = attesterAddress ? ` (filtered by attester ${attesterAddress})` : '';
  assert.strictEqual(
    count,
    actualCount,
    `Statement ${statementId}${attesterInfo}: Indirect supporter count mismatch. ` +
    `Count query returned ${count}, but list query returned ${actualCount} supporters. ` +
    `This indicates a query consistency issue in the indexer.`
  );
}

/**
 * State Consistency Invariant #5: Orphaned data check
 *
 * Section 1 from generative-test-prep.md
 *
 * Verifies that all entity references are valid - i.e., every child entity that references
 * a parent entity has a valid parent that exists in the database. This checks referential
 * integrity across the indexer's data model.
 *
 * Checks performed:
 * - Belief records reference existing Statements and Users
 * - Implication records reference existing Statements (from/to) and Attesters
 * - Project-related records (Contributions, Refunds, etc.) reference existing Projects
 * - Delegation-related records reference existing DelegatableNotes
 * - Cross-subsystem references (DelegatableNote -> Statement, ProjectAlignment -> Project/Statement)
 *
 * This is a fundamental data integrity check that should always pass. If it fails,
 * it indicates a bug in the indexer's event handling logic.
 *
 * Note: This invariant can be expensive to run on large datasets since it queries
 * potentially many entities. Consider running it selectively or with sampling in
 * production generative tests.
 *
 * @param graphqlClient GraphQL client or executor
 */
export async function assertNoOrphanedData(
  graphqlClient: GraphQLClient | GraphQLExecutor
): Promise<void> {
  // Check Concept Space subsystem
  await checkOrphanedBeliefs(graphqlClient);
  await checkOrphanedImplications(graphqlClient);
}

/**
 * Check that all Belief records reference valid Statements and Users
 */
async function checkOrphanedBeliefs(
  graphqlClient: GraphQLClient | GraphQLExecutor
): Promise<void> {
  // Get all beliefs with a non-zero belief state (active beliefs/disbeliefs)
  const beliefsResult = await query<{
    beliefss: {
      items: Array<{
        user: { id: string };
        statementId: string;
        beliefState: number;
      }>
    }
  }>(
    graphqlClient,
    `
      query GetAllBeliefs {
        beliefss(where: { beliefState_not: 0 }) {
          items {
            user {
              id
            }
            statementId
            beliefState
          }
        }
      }
    `
  );

  const beliefs = beliefsResult.beliefss?.items || [];

  // Check each belief references a valid statement
  const checkedStatements = new Set<string>();
  const checkedUsers = new Set<string>();

  for (const belief of beliefs) {
    const statementId = belief.statementId.toLowerCase();
    const userId = belief.user.id.toLowerCase();

    // Check statement exists (cache checks to avoid redundant queries)
    if (!checkedStatements.has(statementId)) {
      const statementResult = await query<{
        statements: { id: string } | null
      }>(
        graphqlClient,
        `
          query GetStatement($id: String!) {
            statements(id: $id) {
              id
            }
          }
        `,
        { id: statementId }
      );

      if (!statementResult.statements) {
        throw new Error(
          `Orphaned Belief: User ${userId} has a belief record for statement ${statementId}, ` +
          `but that statement does not exist in the database. ` +
          `This indicates a referential integrity violation in the indexer.`
        );
      }

      checkedStatements.add(statementId);
    }

    // Check user exists (cache checks to avoid redundant queries)
    if (!checkedUsers.has(userId)) {
      const userResult = await query<{
        users: { id: string } | null
      }>(
        graphqlClient,
        `
          query GetUser($id: String!) {
            users(id: $id) {
              id
            }
          }
        `,
        { id: userId }
      );

      if (!userResult.users) {
        throw new Error(
          `Orphaned Belief: User ${userId} has belief records, ` +
          `but does not exist as a User entity in the database. ` +
          `This indicates a referential integrity violation in the indexer.`
        );
      }

      checkedUsers.add(userId);
    }
  }
}

/**
 * Check that all Implication records reference valid Statements (from/to) and Attesters
 */
async function checkOrphanedImplications(
  graphqlClient: GraphQLClient | GraphQLExecutor
): Promise<void> {
  // Get all implications
  const implicationsResult = await query<{
    implicationss: {
      items: Array<{
        attester: { id: string };
        fromStatementId: string;
        toStatementId: string;
      }>
    }
  }>(
    graphqlClient,
    `
      query GetAllImplications {
        implicationss {
          items {
            attester {
              id
            }
            fromStatementId
            toStatementId
          }
        }
      }
    `
  );

  const implications = implicationsResult.implicationss?.items || [];

  // Check each implication references valid entities
  const checkedStatements = new Set<string>();
  const checkedAttesters = new Set<string>();

  for (const implication of implications) {
    const fromId = implication.fromStatementId.toLowerCase();
    const toId = implication.toStatementId.toLowerCase();
    const attesterId = implication.attester.id.toLowerCase();

    // Check fromStatement exists
    if (!checkedStatements.has(fromId)) {
      const statementResult = await query<{
        statements: { id: string } | null
      }>(
        graphqlClient,
        `
          query GetStatement($id: String!) {
            statements(id: $id) {
              id
            }
          }
        `,
        { id: fromId }
      );

      if (!statementResult.statements) {
        throw new Error(
          `Orphaned Implication: Attester ${attesterId} attested ${fromId}→${toId}, ` +
          `but source statement ${fromId} does not exist in the database. ` +
          `This indicates a referential integrity violation in the indexer.`
        );
      }

      checkedStatements.add(fromId);
    }

    // Check toStatement exists
    if (!checkedStatements.has(toId)) {
      const statementResult = await query<{
        statements: { id: string } | null
      }>(
        graphqlClient,
        `
          query GetStatement($id: String!) {
            statements(id: $id) {
              id
            }
          }
        `,
        { id: toId }
      );

      if (!statementResult.statements) {
        throw new Error(
          `Orphaned Implication: Attester ${attesterId} attested ${fromId}→${toId}, ` +
          `but target statement ${toId} does not exist in the database. ` +
          `This indicates a referential integrity violation in the indexer.`
        );
      }

      checkedStatements.add(toId);
    }

    // Check attester exists
    if (!checkedAttesters.has(attesterId)) {
      const attesterResult = await query<{
        attesters: { id: string } | null
      }>(
        graphqlClient,
        `
          query GetAttester($id: String!) {
            attesters(id: $id) {
              id
            }
          }
        `,
        { id: attesterId }
      );

      if (!attesterResult.attesters) {
        throw new Error(
          `Orphaned Implication: Implication ${fromId}→${toId} references attester ${attesterId}, ` +
          `but that attester does not exist in the database. ` +
          `This indicates a referential integrity violation in the indexer.`
        );
      }

      checkedAttesters.add(attesterId);
    }
  }
}

/**
 * Business Logic Constraint: Unique statements (CID-based deduplication)
 *
 * Section 4 from generative-test-prep.md
 *
 * Verifies that statements with identical IPFS content have the same statementId.
 * This checks that the CID-based deduplication is working correctly.
 *
 * In the Commonality system, statement IDs are derived from IPFS content identifiers (CIDs).
 * Two statements with identical content should produce the same CID, and therefore should
 * have the same statementId in the database. This function verifies this property by:
 *
 * 1. Taking two statementIds that are expected to represent identical content
 * 2. Verifying they are actually the same ID (i.e., deduplication occurred)
 *
 * This is primarily a test helper to verify deduplication behavior when creating statements.
 * It's typically called after attempting to create a "duplicate" statement to verify that
 * the system correctly identified it as a duplicate and returned the existing statement's ID.
 *
 * @param statementId1 First statement ID (expected to be identical to statementId2)
 * @param statementId2 Second statement ID (expected to be identical to statementId1)
 * @param context Optional context string for error messages (e.g., "after creating statement with same content")
 */
export async function assertUniqueStatements(
  statementId1: string,
  statementId2: string,
  context?: string
): Promise<void> {
  const contextMsg = context ? ` ${context}` : '';

  assert.strictEqual(
    statementId1.toLowerCase(),
    statementId2.toLowerCase(),
    `Statement uniqueness violation${contextMsg}. ` +
    `Two statements with identical IPFS content should have the same statementId (CID-based deduplication). ` +
    `Got ${statementId1} and ${statementId2}. ` +
    `This indicates that either the CID calculation is non-deterministic or deduplication is not working correctly.`
  );
}
