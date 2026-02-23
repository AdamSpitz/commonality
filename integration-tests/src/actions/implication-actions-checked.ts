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
import {
  attestImplication,
  cidToBytes32,
  waitForIndexerToSyncToTxHash,
  type TestClients,
  type ImplicationsContract,
  IpfsCidV1,
} from '@commonality/sdk';
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
 *   'QmSpecificStatement',
 *   'QmGeneralStatement'
 * );
 *
 * // With explanation
 * const txHash = await attestImplicationChecked(
 *   clients,
 *   implicationsContract,
 *   graphqlClient,
 *   'QmSpecificStatement',
 *   'QmGeneralStatement',
 *   'QmExplanation123'
 * );
 *
 * // With expected indirect supporters verification
 * const txHash = await attestImplicationChecked(
 *   clients,
 *   implicationsContract,
 *   graphqlClient,
 *   'QmSpecificStatement',
 *   'QmGeneralStatement',
 *   undefined,
 *   [user1.account, user2.account] // These users believe the specific statement
 * );
 * // State transition properties and invariants are automatically verified
 * ```
 */
export async function attestImplicationChecked(
  clients: TestClients,
  implicationsContract: ImplicationsContract,
  machinery: ActionTestingMachinery,
  fromStatementCid: IpfsCidV1,
  toStatementCid: IpfsCidV1,
  explanationCid?: IpfsCidV1,
  expectedIndirectSupporters?: string[],
  options?: ActionRunOptions
): Promise<Hash> {
  const fromStatementCid = cidToBytes32(fromStatementCid);
  const toStatementCid = cidToBytes32(toStatementCid);
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
      await waitForIndexerToSyncToTxHash(machinery.graphqlClient, clients.publicClient, hash);
      return hash;
    },
    attestImplicationMetadata,
    context,
    options
  );
}
