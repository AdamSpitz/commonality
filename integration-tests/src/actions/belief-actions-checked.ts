/**
 * Checked versions of belief actions
 *
 * These wrapper functions execute belief actions and automatically verify
 * state transition properties and invariants.
 *
 * Usage:
 *   // Instead of:
 *   await believeStatement(clients, contract, cid);
 *   await assertBeliefCountsMatch(graphqlClient, statementId);
 *
 *   // Write:
 *   await believeStatementChecked(clients, contract, graphqlClient, cid);
 */

import type { Hash } from 'viem';
import { believeStatement, disbelieveStatement, clearOpinion, type BeliefsContract } from '@commonality/sdk/conceptspace';
import { waitForIndexerToSyncToTxHash } from '@commonality/sdk/indexer-sync';
import type { WriteClients, IpfsCidV1 } from '@commonality/sdk/utils';
import {
  runActionAndCheckProperties,
  type ActionContext,
  type ActionRunOptions,
} from './action-framework.js';
import {
  believeStatementMetadata,
  disbelieveStatementMetadata,
  clearOpinionMetadata,
} from './belief-action-properties.js';
import { ActionTestingMachinery } from './action-machinery.js';

/**
 * Express belief in a statement (with property checking)
 *
 * This wrapper runs the believeStatement action and automatically:
 * 1. Checks that believer/disbeliever counts change correctly
 * 2. Verifies that cached counts match individual belief records
 *
 * @param clients - Test wallet and public clients
 * @param beliefsContract - The Beliefs contract instance
 * @param graphqlClient - GraphQL client for the indexer
 * @param statementCid - IPFS CID of the statement content
 * @param options - Optional: control which checks run
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * const txHash = await believeStatementChecked(
 *   clients,
 *   beliefsContract,
 *   graphqlClient,
 *   'bafyStatementCid123'
 * );
 * // State transition properties and invariants are automatically verified
 * ```
 */
export async function believeStatementChecked(
  clients: WriteClients,
  beliefsContract: BeliefsContract,
  machinery: ActionTestingMachinery,
  statementCid: IpfsCidV1,
  options?: ActionRunOptions
): Promise<Hash> {
  const userAddress = clients.account;

  const context: ActionContext = {
    machinery,
    contracts: { beliefs: beliefsContract },
    entities: {
      statementCid,
      userAddress,
    },
  };

  return await runActionAndCheckProperties(
    async () => {
      const hash = await believeStatement(clients, beliefsContract, statementCid);
      await waitForIndexerToSyncToTxHash(machinery, clients.publicClient, hash);
      return hash;
    },
    believeStatementMetadata,
    context,
    options
  );
}

/**
 * Express disbelief in a statement (with property checking)
 *
 * This wrapper runs the disbelieveStatement action and automatically:
 * 1. Checks that believer/disbeliever counts change correctly
 * 2. Verifies that cached counts match individual belief records
 *
 * @param clients - Test wallet and public clients
 * @param beliefsContract - The Beliefs contract instance
 * @param graphqlClient - GraphQL client for the indexer
 * @param statementCid - IPFS CID of the statement content
 * @param options - Optional: control which checks run
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * const txHash = await disbelieveStatementChecked(
 *   clients,
 *   beliefsContract,
 *   graphqlClient,
 *   'bafyStatementCid123'
 * );
 * // State transition properties and invariants are automatically verified
 * ```
 */
export async function disbelieveStatementChecked(
  clients: WriteClients,
  beliefsContract: BeliefsContract,
  machinery: ActionTestingMachinery,
  statementCid: IpfsCidV1,
  options?: ActionRunOptions
): Promise<Hash> {
  const userAddress = clients.account;

  const context: ActionContext = {
    machinery,
    contracts: { beliefs: beliefsContract },
    entities: {
      statementCid,
      userAddress,
    },
  };

  return await runActionAndCheckProperties(
    async () => {
      const hash = await disbelieveStatement(clients, beliefsContract, statementCid);
      await waitForIndexerToSyncToTxHash(machinery, clients.publicClient, hash);
      return hash;
    },
    disbelieveStatementMetadata,
    context,
    options
  );
}

/**
 * Clear opinion on a statement (with property checking)
 *
 * This wrapper runs the clearOpinion action and automatically:
 * 1. Checks that believer/disbeliever counts change correctly
 * 2. Verifies that cached counts match individual belief records
 *
 * @param clients - Test wallet and public clients
 * @param beliefsContract - The Beliefs contract instance
 * @param graphqlClient - GraphQL client for the indexer
 * @param statementCid - IPFS CID of the statement content
 * @param options - Optional: control which checks run
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * const txHash = await clearOpinionChecked(
 *   clients,
 *   beliefsContract,
 *   graphqlClient,
 *   'bafyStatementCid123'
 * );
 * // State transition properties and invariants are automatically verified
 * ```
 */
export async function clearOpinionChecked(
  clients: WriteClients,
  beliefsContract: BeliefsContract,
  machinery: ActionTestingMachinery,
  statementCid: IpfsCidV1,
  options?: ActionRunOptions
): Promise<Hash> {
  const userAddress = clients.account;

  const context: ActionContext = {
    machinery,
    contracts: { beliefs: beliefsContract },
    entities: {
      statementCid,
      userAddress,
    },
  };

  return await runActionAndCheckProperties(
    async () => {
      const hash = await clearOpinion(clients, beliefsContract, statementCid);
      await waitForIndexerToSyncToTxHash(machinery, clients.publicClient, hash);
      return hash;
    },
    clearOpinionMetadata,
    context,
    options
  );
}
