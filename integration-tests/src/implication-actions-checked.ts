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
  waitForSync,
  type TestClients,
  type ImplicationsContract,
} from '@commonality/sdk';
import type { GraphQLClient, GraphQLExecutor } from './invariants.js';
import {
  runActionAndCheckProperties,
  type ActionContext,
  type ActionRunOptions,
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
 *
 * @param clients - Test wallet and public clients
 * @param implicationsContract - The Implications contract instance
 * @param graphqlClient - GraphQL client for the indexer
 * @param fromStatementCid - IPFS CID of the statement that implies
 * @param toStatementCid - IPFS CID of the statement that is implied
 * @param options - Optional: control which checks run
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * const txHash = await attestImplicationChecked(
 *   clients,
 *   implicationsContract,
 *   graphqlClient,
 *   'QmSpecificStatement',
 *   'QmGeneralStatement'
 * );
 * // State transition properties and invariants are automatically verified
 * ```
 */
export async function attestImplicationChecked(
  clients: TestClients,
  implicationsContract: ImplicationsContract,
  graphqlClient: GraphQLClient | GraphQLExecutor,
  fromStatementCid: string,
  toStatementCid: string,
  options?: ActionRunOptions
): Promise<Hash> {
  const fromStatementId = cidToBytes32(fromStatementCid);
  const toStatementId = cidToBytes32(toStatementCid);
  const attesterAddress = clients.account;

  const context: ActionContext = {
    graphqlClient,
    contracts: {},
    entities: {
      fromStatementId,
      toStatementId,
      attesterAddress,
    },
  };

  return await runActionAndCheckProperties(
    async () => {
      const hash = await attestImplication(
        clients,
        implicationsContract,
        fromStatementCid,
        toStatementCid
      );
      const receipt = await clients.publicClient.getTransactionReceipt({ hash });
      await waitForSync(graphqlClient, receipt.blockNumber);
      return hash;
    },
    attestImplicationMetadata,
    context,
    options
  );
}
