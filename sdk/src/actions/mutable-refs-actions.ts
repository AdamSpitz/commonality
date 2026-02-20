/**
 * User actions for Mutable Refs subsystem
 */

import { type Address, type Hash } from 'viem';
import { type TestClients, uploadToIPFS } from './common.js';
import { getUserRef } from '../indexer-queries/mutable-refs-queries.js';
import { type GraphQLClient } from '../indexer-queries/common.js';

// ============================================================================
// Mutable Refs Actions
// ============================================================================

export interface MutableRefUpdaterContract {
  address: Address;
  abi: any;
}

/**
 * Update or create a named ref
 *
 * Creates or updates a mutable reference that points to an IPFS CID or other string value.
 * This is useful for tracking "my created statements", bookmarks, drafts, etc.
 *
 * @param clients - Test wallet and public clients for interacting with the blockchain
 * @param mutableRefUpdaterContract - The MutableRefUpdater contract instance
 * @param name - Name of the ref (e.g., "created-statements", "bookmarks")
 * @param refValue - Value to store (typically an IPFS CID or JSON string)
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * // Create a ref pointing to a list of statements
 * await updateRef(clients, contract, "created-statements", "QmListOfStatements123");
 *
 * // Update it later with a new list
 * await updateRef(clients, contract, "created-statements", "QmUpdatedList456");
 *
 * // Clear a ref by setting it to empty string
 * await updateRef(clients, contract, "draft-post", "");
 * ```
 */
export async function updateRef(
  clients: TestClients,
  mutableRefUpdaterContract: MutableRefUpdaterContract,
  name: string,
  refValue: string
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: mutableRefUpdaterContract.address,
    abi: mutableRefUpdaterContract.abi,
    functionName: 'updateRef',
    args: [name, refValue],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Read a ref value directly from the contract
 *
 * This reads the current value of a ref from the blockchain state.
 * For most queries, you should use the indexer queries instead (they're faster
 * and provide history), but this is useful for verification or when the indexer
 * isn't available.
 *
 * @param clients - Test wallet and public clients for interacting with the blockchain
 * @param mutableRefUpdaterContract - The MutableRefUpdater contract instance
 * @param owner - Address of the ref owner
 * @param name - Name of the ref
 * @returns The ref value (empty string if not set)
 *
 * @example
 * ```typescript
 * const value = await getRef(clients, contract, userAddress, "created-statements");
 * console.log("Current ref value:", value);
 * ```
 */
export async function getRef(
  clients: TestClients,
  mutableRefUpdaterContract: MutableRefUpdaterContract,
  owner: Address,
  name: string
): Promise<string> {
  const value = await clients.publicClient.readContract({
    address: mutableRefUpdaterContract.address,
    abi: mutableRefUpdaterContract.abi,
    functionName: 'getRef',
    args: [owner, name],
  } as any);

  return value as string;
}

// ============================================================================
// Higher-level List Management Functions
// ============================================================================

/**
 * Append an item to a user's list stored in a mutable ref
 *
 * This is a higher-level abstraction that handles the complexity of:
 * - Fetching the current list from the indexer
 * - Parsing the list with proper error handling and format migration
 * - Appending the new item
 * - Uploading the updated list to IPFS
 * - Updating the ref to point to the new list
 *
 * The list format is a JSON object with structure:
 * ```json
 * {
 *   "statements": ["cid1", "cid2", ...],
 *   "version": 1
 * }
 * ```
 *
 * This function handles migration from older formats (e.g., a single CID string
 * or an array of CIDs) for backward compatibility.
 *
 * @param graphqlClient - GraphQL client for querying the indexer
 * @param clients - Test wallet and public clients for blockchain interaction
 * @param mutableRefUpdaterContract - The MutableRefUpdater contract instance
 * @param listName - Name of the ref (e.g., "created-statements", "favorites")
 * @param itemCid - CID to append to the list
 * @param options - Optional configuration
 * @param options.deduplicate - If true, don't add the item if it already exists (default: true)
 * @returns Transaction hash of the updateRef call
 *
 * @example
 * ```typescript
 * // Add a statement to the user's created statements list
 * await appendToUserList(
 *   graphqlClient,
 *   clients,
 *   mutableRefContract,
 *   'created-statements',
 *   'QmNewStatement123'
 * );
 *
 * // Add a favorite without deduplication
 * await appendToUserList(
 *   graphqlClient,
 *   clients,
 *   mutableRefContract,
 *   'favorites',
 *   'QmFavorite456',
 *   { deduplicate: false }
 * );
 * ```
 */
export async function appendToUserList(
  graphqlClient: GraphQLClient | { indexerClient: GraphQLClient },
  clients: TestClients,
  mutableRefUpdaterContract: MutableRefUpdaterContract,
  listName: string,
  itemCid: string,
  options?: { deduplicate?: boolean }
): Promise<Hash> {
  const deduplicate = options?.deduplicate ?? true;

  // Support both old GraphQLClient and new GraphQLExecutor
  const actualClient = 'indexerClient' in graphqlClient ? graphqlClient.indexerClient : graphqlClient;

  // Fetch existing list from indexer
  const existingRef = await getUserRef(actualClient, clients.account, listName);

  let newList: string[];

  if (existingRef?.value) {
    // Try to parse existing list with format migration
    try {
      const existingData = JSON.parse(existingRef.value);

      if (Array.isArray(existingData.statements)) {
        // Current format: { statements: [...], version: 1 }
        newList = [...existingData.statements];
      } else if (Array.isArray(existingData)) {
        // Old format: just an array
        newList = [...existingData];
      } else {
        // Very old format: single CID string (the entire ref value)
        newList = [existingRef.value];
      }
    } catch {
      // Parse error - treat the entire value as a single CID
      newList = [existingRef.value];
    }
  } else {
    // No existing list - create new one
    newList = [];
  }

  // Add new item (with optional deduplication)
  if (deduplicate) {
    if (!newList.includes(itemCid)) {
      newList.push(itemCid);
    }
  } else {
    newList.push(itemCid);
  }

  // Create new list data with current format
  const listData = {
    statements: newList,
    version: 1,
  };

  // Upload to IPFS
  const listCid = await uploadToIPFS(listData);

  // Update ref
  return await updateRef(clients, mutableRefUpdaterContract, listName, listCid);
}

/**
 * Add a statement to the user's "created-statements" list
 *
 * This is a convenience wrapper around `appendToUserList` specifically for
 * tracking statements created by the user. This is commonly used after
 * creating and signing a new statement.
 *
 * @param graphqlClient - GraphQL client for querying the indexer
 * @param clients - Test wallet and public clients for blockchain interaction
 * @param mutableRefUpdaterContract - The MutableRefUpdater contract instance
 * @param statementCid - CID of the statement to add
 * @returns Transaction hash of the updateRef call
 *
 * @example
 * ```typescript
 * // After creating and signing a statement
 * const statementCid = await uploadToIPFS(statementData);
 * await believeStatement(clients, beliefsContract, statementCid);
 * await addToCreatedStatements(graphqlClient, clients, mutableRefContract, statementCid);
 * ```
 */
export async function addToCreatedStatements(
  graphqlClient: GraphQLClient | { indexerClient: GraphQLClient },
  clients: TestClients,
  mutableRefUpdaterContract: MutableRefUpdaterContract,
  statementCid: string
): Promise<Hash> {
  return await appendToUserList(
    graphqlClient,
    clients,
    mutableRefUpdaterContract,
    'created-statements',
    statementCid,
    { deduplicate: true }
  );
}
