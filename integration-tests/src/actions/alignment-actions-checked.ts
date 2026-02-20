/**
 * Checked versions of alignment attestation actions
 *
 * These wrapper functions execute alignment actions and automatically verify
 * state transition properties and invariants.
 *
 * Usage:
 *   // Instead of:
 *   await attestAlignment(clients, contract, subjectAddress, statementCid, topicStatementCid);
 *   await waitForIndexerToSyncToTxHash(machinery.graphqlClient, publicClient);
 *   // ... manual assertions ...
 *
 *   // Write:
 *   await attestAlignmentChecked(clients, contract, graphqlClient, subjectAddress, statementCid, topicStatementCid, statementId);
 */

import type { Hash, Address } from 'viem';
import {
  attestAlignment,
  attestAlignmentsBatch,
  waitForIndexerToSyncToTxHash,
  type TestClients,
  type AlignmentAttestationsContract,
} from '@commonality/sdk';
import type { GraphQLClient, GraphQLExecutor } from '../utils/invariants.js';
import {
  runActionAndCheckProperties,
  type ActionContext,
  type ActionRunOptions,
  ActionTestingMachinery,
} from './action-framework.js';
import {
  attestAlignmentMetadata,
  attestAlignmentsBatchMetadata,
} from './alignment-action-properties.js';

/**
 * Attest a subject-statement alignment (with property checking)
 *
 * This wrapper runs the attestAlignment action and automatically:
 * 1. Checks that the alignment is created in the indexer
 * 2. Verifies that both forward and reverse query indexes are updated
 * 3. Verifies bidirectional query consistency
 * 4. Checks that no orphaned data exists
 *
 * @param clients - Test wallet and public clients
 * @param alignmentAttestationsContract - The AlignmentAttestations contract instance
 * @param machinery - Action testing machinery
 * @param subjectAddress - Address of the subject (project, user, etc.) to align
 * @param statementCid - IPFS CID of the statement
 * @param topicStatementCid - IPFS CID of the topic for indexer filtering
 * @param statementId - Statement ID (bytes32 derived from CID)
 * @param options - Optional: control which checks run
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * const txHash = await attestAlignmentChecked(
 *   clients,
 *   alignmentAttestationsContract,
 *   machinery,
 *   projectDetails.tokenAddress,
 *   statementCid,
 *   topicStatementCid,
 *   cidToBytes32(statementCid)
 * );
 * // State transition properties and invariants are automatically verified
 * ```
 */
export async function attestAlignmentChecked(
  clients: TestClients,
  alignmentAttestationsContract: AlignmentAttestationsContract,
  machinery: ActionTestingMachinery,
  subjectAddress: Address,
  statementCid: string,
  topicStatementCid: string,
  statementId: string,
  options?: ActionRunOptions
): Promise<Hash> {
  const context: ActionContext = {
    machinery,
    entities: {
      subjectAddress,
      statementId,
      attesterAddress: clients.account,
    },
  };

  return await runActionAndCheckProperties(
    async () => {
      const hash = await attestAlignment(
        clients,
        alignmentAttestationsContract,
        subjectAddress,
        statementCid,
        topicStatementCid
      );
      await waitForIndexerToSyncToTxHash(machinery.graphqlClient, clients.publicClient, hash);
      return hash;
    },
    attestAlignmentMetadata,
    context,
    options
  );
}

/**
 * Attest multiple subject-statement alignments in a batch (with property checking)
 *
 * This wrapper runs the attestAlignmentsBatch action and automatically:
 * 1. Checks that no orphaned data exists after the batch operation
 *
 * Note: State transition property checks are skipped for batch operations since
 * tracking multiple alignments would require more complex state management.
 *
 * @param clients - Test wallet and public clients
 * @param alignmentAttestationsContract - The AlignmentAttestations contract instance
 * @param graphqlClient - GraphQL client for the indexer
 * @param subjectAddresses - Addresses of the subjects to align
 * @param statementCids - IPFS CIDs of the statements (parallel to subjectAddresses)
 * @param topicStatementCids - IPFS CIDs of the topics (parallel to subjectAddresses)
 * @param options - Optional: control which checks run
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * const txHash = await attestAlignmentsBatchChecked(
 *   clients,
 *   alignmentAttestationsContract,
 *   graphqlClient,
 *   [project1.tokenAddress, project2.tokenAddress],
 *   [statement1Cid, statement2Cid],
 *   [topicCid, topicCid]
 * );
 * // Invariants are automatically verified
 * ```
 */
export async function attestAlignmentsBatchChecked(
  clients: TestClients,
  alignmentAttestationsContract: AlignmentAttestationsContract,
  machinery: ActionTestingMachinery,
  subjectAddresses: Address[],
  statementCids: string[],
  topicStatementCids: string[],
  options?: ActionRunOptions
): Promise<Hash> {
  // For batch operations, we don't track specific entities since there are many
  const context: ActionContext = {
    machinery,
    entities: {
      attesterAddress: clients.account,
    },
  };

  return await runActionAndCheckProperties(
    async () => {
      const hash = await attestAlignmentsBatch(
        clients,
        alignmentAttestationsContract,
        subjectAddresses,
        statementCids,
        topicStatementCids
      );
      await waitForIndexerToSyncToTxHash(machinery.graphqlClient, clients.publicClient, hash);
      return hash;
    },
    attestAlignmentsBatchMetadata,
    context,
    options
  );
}
