/**
 * User actions for Mutable Refs subsystem
 */

import { type Address, type Hash, type Abi } from 'viem';
import { type WriteClients } from '../../utils/ethereum.js';
import { getUserList } from './queries.js';
import { SDKMachinery } from '../../machinery.js';
import { IpfsCidV1 } from '../../utils/cid-types.js';

// ============================================================================
// Mutable Refs Actions
// ============================================================================

export interface MutableRefUpdaterContract {
  address: Address;
  abi: Abi;
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
  clients: WriteClients,
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
  clients: WriteClients,
  mutableRefUpdaterContract: MutableRefUpdaterContract,
  owner: Address,
  name: string
): Promise<string> {
  // @ts-expect-error - viem type inference issue with generic Abi and readContract
  const value = await clients.publicClient.readContract({
    address: mutableRefUpdaterContract.address,
    abi: mutableRefUpdaterContract.abi,
    functionName: 'getRef',
    args: [owner, name],
  });

  return value as string;
}

// ============================================================================
// Higher-level List Management Functions
// ============================================================================

/**
 * Append an item to a user's list stored in a mutable ref
 *
 * This is a higher-level abstraction that handles the complexity of:
 * - Reconstructing the current list from the indexer's RefUpdated event history
 * - Folding legacy JSON-list ref values for backward compatibility
 * - Appending the new item
 * - Writing one append event whose value is the appended CID
 *
 * This replaces the old "upload a full JSON list to IPFS, then point the ref at the
 * new list CID" pattern. The mutable ref's latest value is now simply the latest
 * appended item; callers that want the list should read it with getUserList().
 *
 * @param machinery - SDK machinery (provides indexer access and legacy IPFS fallback configuration)
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
 *   machinery,
 *   clients,
 *   mutableRefContract,
 *   'created-statements',
 *   'bafyNewStatement123'
 * );
 *
 * // Add a favorite without deduplication
 * await appendToUserList(
 *   machinery,
 *   clients,
 *   mutableRefContract,
 *   'favorites',
 *   'bafyFavorite456',
 *   { deduplicate: false }
 * );
 * ```
 */
export async function appendToUserList(
  machinery: SDKMachinery,
  clients: WriteClients,
  mutableRefUpdaterContract: MutableRefUpdaterContract,
  listName: string,
  itemCid: IpfsCidV1,
  options?: { deduplicate?: boolean }
): Promise<Hash> {
  const deduplicate = options?.deduplicate ?? true;

  const existingList = await getUserList(machinery, clients.account, listName, { deduplicate });
  if (deduplicate && existingList.includes(itemCid)) {
    return '0x0000000000000000000000000000000000000000000000000000000000000000' as Hash;
  }

  return await updateRef(clients, mutableRefUpdaterContract, listName, itemCid);
}

/**
 * Add a statement to the user's "created-statements" list
 *
 * This is a convenience wrapper around `appendToUserList` specifically for
 * tracking statements created by the user. This is commonly used after
 * creating and signing a new statement.
 *
 * @param machinery - SDK machinery (provides indexer access and legacy IPFS fallback configuration)
 * @param clients - Test wallet and public clients for blockchain interaction
 * @param mutableRefUpdaterContract - The MutableRefUpdater contract instance
 * @param statementCid - CID of the statement to add
 * @returns Transaction hash of the updateRef call
 *
 * @example
 * ```typescript
 * // After creating and signing a statement
 * const { cid: statementCid } = await createAndSignStatement(
 *   machinery,
 *   clients,
 *   contracts,
 *   statementData
 * );
 * await addToCreatedStatements(machinery, clients, mutableRefContract, statementCid);
 * ```
 */
export async function addToCreatedStatements(
  machinery: SDKMachinery,
  clients: WriteClients,
  mutableRefUpdaterContract: MutableRefUpdaterContract,
  statementCid: IpfsCidV1
): Promise<Hash> {
  return await appendToUserList(
    machinery,
    clients,
    mutableRefUpdaterContract,
    'created-statements',
    statementCid,
    { deduplicate: true }
  );
}
