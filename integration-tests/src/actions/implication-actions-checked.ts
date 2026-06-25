/**
 * Checked versions of implication actions
 *
 * These wrapper functions execute implication actions and automatically verify
 * state transition properties and invariants.
 *
 * Usage:
 *   // Instead of:
 *   await attestImplication(clients, implicationsContract, fromCid, toCid);
 *   // ... manual property checks
 *
 *   // Write:
 *   await attestImplicationChecked(clients, implicationsContract, graphqlClient, fromCid, toCid);
 */

import type { Hash } from 'viem';
import { attestImplication, type ImplicationsContract } from '@commonality/sdk/conceptspace';
import { waitForIndexerToSyncToTxHash } from '@commonality/sdk/indexer-sync';
import { type WriteClients, IpfsCidV1 } from '@commonality/sdk/utils';
import {
  runActionAndCheckProperties,
  type ActionContext,
  type ActionRunOptions,
  ActionTestingMachinery,
} from './action-framework.js';
import { attestImplicationMetadata } from './implication-action-properties.js';

/**
 * Attest that one statement implies another (with property checking)
 *
 * This wrapper runs the attestImplication action and automatically:
 * 1. Checks that the implication appears in "implications from" queries
 * 2. Checks that the implication appears in "implications to" queries
 * 3. Verifies the implication is queryable from both directions
 * 4. Verifies the attester is correctly recorded
 * 5. Verifies that believers of the "from" statement appear as indirect supporters of the "to" statement
 *
 * @param clients - Test wallet and public clients
 * @param implicationsContract - The Implications contract instance
 * @param graphqlClient - GraphQL client for the indexer
 * @param fromStatementCid - IPFS CID of the statement that implies
 * @param toStatementCid - IPFS CID of the statement that is implied
 * @param explanationCid - Optional: IPFS CID of the explanation for this implication
 * @param expectedIndirectSupporters - Optional: addresses of users who should appear as indirect supporters
 * @param options - Optional: control which checks run
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * // Basic usage
 * const txHash = await attestImplicationChecked(
 *   clients,
 *   implicationsContract,
 *   graphqlClient,
 *   'bafySpecificStatement',
 *   'bafyGeneralStatement'
 * );
 *
 * // With explanation
 * const txHash = await attestImplicationChecked(
 *   clients,
 *   implicationsContract,
 *   graphqlClient,
 *   'bafySpecificStatement',
 *   'bafyGeneralStatement',
 *   'bafyExplanation123'
 * );
 *
 * // With expected indirect supporters verification
 * const txHash = await attestImplicationChecked(
 *   clients,
 *   implicationsContract,
 *   graphqlClient,
 *   'bafySpecificStatement',
 *   'bafyGeneralStatement',
 *   undefined,
 *   [user1.account, user2.account] // These users believe the specific statement
 * );
 * // State transition properties and invariants are automatically verified
 * ```
 */
export async function attestImplicationChecked(
  clients: WriteClients,
  implicationsContract: ImplicationsContract,
  machinery: ActionTestingMachinery,
  fromStatementCid: IpfsCidV1,
  toStatementCid: IpfsCidV1,
  explanationCid?: IpfsCidV1,
  expectedIndirectSupporters?: string[],
  options?: ActionRunOptions
): Promise<Hash> {
  const attesterAddress = clients.account;

  const context: ActionContext = {
    machinery,
    contracts: {},
    entities: {
      fromStatementCid,
      toStatementCid,
      attesterAddress,
    },
    extra: expectedIndirectSupporters ? { expectedIndirectSupporters } : undefined,
  };

  return await runActionAndCheckProperties(
    async () => {
      const hash = await attestImplication(
        clients,
        implicationsContract,
        fromStatementCid,
        toStatementCid,
        explanationCid
      );
      await waitForIndexerToSyncToTxHash(machinery, clients.publicClient, hash);
      return hash;
    },
    attestImplicationMetadata,
    context,
    options
  );
}
