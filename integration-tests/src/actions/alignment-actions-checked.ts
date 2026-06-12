/**
 * Checked versions of alignment attestation actions
 *
 * These wrapper functions execute alignment actions and automatically verify
 * state transition properties and invariants.
 *
 * Usage:
 *   // Instead of:
 *   await attestAlignment(clients, contract, toSubjectId(address), statementCid, topicStatementCid);
 *   await waitForIndexerToSyncToTxHash(machinery, publicClient);
 *   // ... manual assertions ...
 *
 *   // Write:
 *   await attestAlignmentChecked(clients, contract, machinery, toSubjectId(address), statementCid, topicStatementCid);
 */

import type { Hash, Address } from 'viem';
import {
  attestAlignment,
  attestAlignmentsBatch,
  toSubjectId,
  waitForIndexerToSyncToTxHash,
  type WriteClients,
  type AlignmentAttestationsContract,
  type IpfsCidV1,
} from '@commonality/sdk';
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
 * @param subjectAddress - Address of the subject (project, user, etc.) to align; converted to subjectId internally
 * @param statementCid - IPFS CID of the statement
 * @param topicStatementCid - IPFS CID of the topic for indexer filtering
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
 *   topicStatementCid
 * );
 * // State transition properties and invariants are automatically verified
 * ```
 */
export async function attestAlignmentChecked(
  clients: WriteClients,
  alignmentAttestationsContract: AlignmentAttestationsContract,
  machinery: ActionTestingMachinery,
  subjectAddress: Address,
  statementCid: IpfsCidV1,
  topicStatementCid: IpfsCidV1,
  options?: ActionRunOptions
): Promise<Hash> {
  const subjectId = toSubjectId(subjectAddress);
  const context: ActionContext = {
    machinery,
    entities: {
      subjectId,
      statementCid,
      attesterAddress: clients.account,
    },
  };

  return await runActionAndCheckProperties(
    async () => {
      const hash = await attestAlignment(
        clients,
        alignmentAttestationsContract,
        subjectId,
        statementCid,
        topicStatementCid
      );
      await waitForIndexerToSyncToTxHash(machinery, clients.publicClient, hash);
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
 * @param machinery - Action testing machinery
 * @param subjectAddresses - Addresses of the subjects to align; converted to subjectIds internally
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
 *   machinery,
 *   [project1.tokenAddress, project2.tokenAddress],
 *   [statement1Cid, statement2Cid],
 *   [topicCid, topicCid]
 * );
 * // Invariants are automatically verified
 * ```
 */
export async function attestAlignmentsBatchChecked(
  clients: WriteClients,
  alignmentAttestationsContract: AlignmentAttestationsContract,
  machinery: ActionTestingMachinery,
  subjectAddresses: Address[],
  statementCids: IpfsCidV1[],
  topicStatementCids: IpfsCidV1[],
  options?: ActionRunOptions
): Promise<Hash> {
  const subjectIds = subjectAddresses.map(toSubjectId);
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
        subjectIds,
        statementCids,
        topicStatementCids
      );
      await waitForIndexerToSyncToTxHash(machinery, clients.publicClient, hash);
      return hash;
    },
    attestAlignmentsBatchMetadata,
    context,
    options
  );
}
