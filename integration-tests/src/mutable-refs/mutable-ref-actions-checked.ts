/**
 * Checked versions of mutable reference actions
 *
 * These wrapper functions execute mutable ref actions and automatically verify
 * state transition properties and invariants.
 *
 * Usage:
 *   // Instead of:
 *   await updateRef(clients, contract, refName, value);
 *   await waitForIndexerToSyncToTxHash(machinery, publicClient);
 *
 *   // Write:
 *   await updateRefChecked(clients, contract, machinery, refName, value);
 */

import type { Hash } from 'viem';
import {
  updateRef,
  appendToUserList,
  waitForIndexerToSyncToTxHash,
  type TestClients,
  type MutableRefUpdaterContract,
  type IpfsCidV1,
} from '@commonality/sdk';
import {
  ActionTestingMachinery,
  runActionAndCheckProperties,
  type ActionContext,
  type ActionRunOptions,
} from '../actions/action-framework.js';
import {
  updateRefMetadata,
  appendToUserListMetadata,
} from './mutable-ref-action-properties.js';

/**
 * Update a mutable reference (with property checking)
 *
 * This wrapper runs the updateRef action and automatically:
 * 1. Checks that the new value is retrievable from both contract and indexer
 * 2. Verifies that the ref value matches between contract and indexer
 * 3. Checks that history is properly maintained
 *
 * @param clients - Test wallet and public clients
 * @param mutableRefContract - The MutableRefUpdater contract instance
 * @param graphqlClient - GraphQL client for the indexer
 * @param refName - Name of the reference to update
 * @param value - New value for the reference (typically an IPFS CID)
 * @param options - Optional: control which checks run
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * const txHash = await updateRefChecked(
 *   clients,
 *   mutableRefContract,
 *   graphqlClient,
 *   'created-statements',
 *   'bafyNewListCid123'
 * );
 * // State transition properties and invariants are automatically verified
 * ```
 */
export async function updateRefChecked(
  clients: TestClients,
  mutableRefContract: MutableRefUpdaterContract,
  machinery: ActionTestingMachinery,
  refName: string,
  value: string,
  options?: ActionRunOptions
): Promise<Hash> {
  const userAddress = clients.account;

  const context: ActionContext = {
    machinery,
    contracts: { mutableRefUpdater: mutableRefContract },
    entities: {
      userAddress,
    },
    extra: {
      refName,
      value,
    },
  };

  return await runActionAndCheckProperties(
    async () => {
      const hash = await updateRef(clients, mutableRefContract, refName, value);
      await waitForIndexerToSyncToTxHash(machinery, clients.publicClient, hash);
      return hash;
    },
    updateRefMetadata,
    context,
    options
  );
}

/**
 * Append to a user list stored in a ref (with property checking)
 *
 * This wrapper runs the appendToUserList action and automatically:
 * 1. Checks that the list is properly updated
 * 2. Verifies that the ref value changed (new CID for the list)
 * 3. Checks that history is properly maintained
 *
 * @param machinery - Action testing machinery containing GraphQL client
 * @param clients - Test wallet and public clients
 * @param mutableRefContract - The MutableRefUpdater contract instance
 * @param refName - Name of the reference containing the list
 * @param itemToAppend - CID of the item to append to the list
 * @param options - Optional: control which checks run
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * const txHash = await appendToUserListChecked(
 *   graphqlClient,
 *   clients,
 *   mutableRefContract,
 *   'created-statements',
 *   'bafyNewStatementCid123'
 * );
 * // State transition properties and invariants are automatically verified
 * ```
 */
export async function appendToUserListChecked(
  machinery: ActionTestingMachinery,
  clients: TestClients,
  mutableRefContract: MutableRefUpdaterContract,
  refName: string,
  itemToAppend: IpfsCidV1,
  options?: ActionRunOptions
): Promise<Hash> {
  const userAddress = clients.account;

  const context: ActionContext = {
    machinery,
    contracts: { mutableRefUpdater: mutableRefContract },
    entities: {
      userAddress,
    },
    extra: {
      refName,
      itemToAppend,
    },
  };

  return await runActionAndCheckProperties(
    async () => {
      const hash = await appendToUserList(machinery, clients, mutableRefContract, refName, itemToAppend);
      await waitForIndexerToSyncToTxHash(machinery, clients.publicClient, hash);
      return hash;
    },
    appendToUserListMetadata,
    context,
    options
  );
}
