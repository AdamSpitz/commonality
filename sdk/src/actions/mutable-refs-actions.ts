/**
 * User actions for Mutable Refs subsystem
 */

import { type Address, type Hash } from 'viem';
import { type TestClients } from './common.js';

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
