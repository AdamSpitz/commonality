/**
 * Checked versions of project alignment actions
 *
 * These wrapper functions execute project alignment actions and automatically verify
 * state transition properties and invariants.
 *
 * Usage:
 *   // Instead of:
 *   await attestProjectAlignment(clients, contract, projectAddress, statementCid);
 *   await waitForSync(graphqlClient, blockNumber);
 *   // ... manual assertions ...
 *
 *   // Write:
 *   await attestProjectAlignmentChecked(clients, contract, graphqlClient, projectAddress, statementCid, statementId);
 */

import type { Hash, Address } from 'viem';
import {
  attestProjectAlignment,
  attestProjectAlignmentsBatch,
  waitForSync,
  type TestClients,
  type ProjectAlignmentContract,
} from '@commonality/sdk';
import type { GraphQLClient, GraphQLExecutor } from './invariants.js';
import {
  runActionAndCheckProperties,
  type ActionContext,
  type ActionRunOptions,
} from './action-framework.js';
import {
  attestProjectAlignmentMetadata,
  attestProjectAlignmentsBatchMetadata,
} from './alignment-action-properties.js';

/**
 * Attest a project-statement alignment (with property checking)
 *
 * This wrapper runs the attestProjectAlignment action and automatically:
 * 1. Checks that the alignment is created in the indexer
 * 2. Verifies that both forward and reverse query indexes are updated
 * 3. Verifies bidirectional query consistency
 * 4. Checks that no orphaned data exists
 *
 * @param clients - Test wallet and public clients
 * @param projectAlignmentContract - The ProjectAlignment contract instance
 * @param graphqlClient - GraphQL client for the indexer
 * @param projectAddress - Address of the project to align
 * @param statementCid - IPFS CID of the statement
 * @param statementId - Statement ID (bytes32 derived from CID)
 * @param options - Optional: control which checks run
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * const txHash = await attestProjectAlignmentChecked(
 *   clients,
 *   projectAlignmentContract,
 *   graphqlClient,
 *   projectDetails.tokenAddress,
 *   statementCid,
 *   cidToBytes32(statementCid)
 * );
 * // State transition properties and invariants are automatically verified
 * ```
 */
export async function attestProjectAlignmentChecked(
  clients: TestClients,
  projectAlignmentContract: ProjectAlignmentContract,
  graphqlClient: GraphQLClient | GraphQLExecutor,
  projectAddress: Address,
  statementCid: string,
  statementId: string,
  options?: ActionRunOptions
): Promise<Hash> {
  const context: ActionContext = {
    graphqlClient,
    entities: {
      projectAddress,
      statementId,
      attesterAddress: clients.account,
    },
  };

  return await runActionAndCheckProperties(
    async () => {
      const hash = await attestProjectAlignment(
        clients,
        projectAlignmentContract,
        projectAddress,
        statementCid
      );
      const receipt = await clients.publicClient.getTransactionReceipt({ hash });
      await waitForSync(graphqlClient, receipt.blockNumber);
      return hash;
    },
    attestProjectAlignmentMetadata,
    context,
    options
  );
}

/**
 * Attest multiple project-statement alignments in a batch (with property checking)
 *
 * This wrapper runs the attestProjectAlignmentsBatch action and automatically:
 * 1. Checks that no orphaned data exists after the batch operation
 *
 * Note: State transition property checks are skipped for batch operations since
 * tracking multiple alignments would require more complex state management.
 *
 * @param clients - Test wallet and public clients
 * @param projectAlignmentContract - The ProjectAlignment contract instance
 * @param graphqlClient - GraphQL client for the indexer
 * @param projectAddresses - Addresses of the projects to align
 * @param statementCids - IPFS CIDs of the statements (parallel to projectAddresses)
 * @param options - Optional: control which checks run
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * const txHash = await attestProjectAlignmentsBatchChecked(
 *   clients,
 *   projectAlignmentContract,
 *   graphqlClient,
 *   [project1.tokenAddress, project2.tokenAddress],
 *   [statement1Cid, statement2Cid]
 * );
 * // Invariants are automatically verified
 * ```
 */
export async function attestProjectAlignmentsBatchChecked(
  clients: TestClients,
  projectAlignmentContract: ProjectAlignmentContract,
  graphqlClient: GraphQLClient | GraphQLExecutor,
  projectAddresses: Address[],
  statementCids: string[],
  options?: ActionRunOptions
): Promise<Hash> {
  // For batch operations, we don't track specific entities since there are many
  const context: ActionContext = {
    graphqlClient,
    entities: {
      attesterAddress: clients.account,
    },
  };

  return await runActionAndCheckProperties(
    async () => {
      const hash = await attestProjectAlignmentsBatch(
        clients,
        projectAlignmentContract,
        projectAddresses,
        statementCids
      );
      const receipt = await clients.publicClient.getTransactionReceipt({ hash });
      await waitForSync(graphqlClient, receipt.blockNumber);
      return hash;
    },
    attestProjectAlignmentsBatchMetadata,
    context,
    options
  );
}
