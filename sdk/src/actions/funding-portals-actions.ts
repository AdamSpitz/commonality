/**
 * User actions for Funding Portals subsystem (ProjectAlignment)
 */

import { type Address, type Hash } from 'viem';
import { cidToBytes32, type TestClients } from './common.js';

// ============================================================================
// ProjectAlignment Actions (Funding Portals)
// ============================================================================

export interface ProjectAlignmentContract {
  address: Address;
  abi: any;
}

/**
 * Attest that a project is aligned with a statement/cause
 *
 * @param topicStatementCid Optional topic CID for indexer filtering. Pass null/undefined for no topic.
 *                          For project-alignment attestations, use a known hardcoded statement.
 */
export async function attestProjectAlignment(
  clients: TestClients,
  projectAlignmentContract: ProjectAlignmentContract,
  projectAddress: Address,
  statementCid: string,
  topicStatementCid?: string | null
): Promise<Hash> {
  const statementId = cidToBytes32(statementCid);
  const topicStatementId = topicStatementCid ? cidToBytes32(topicStatementCid) : '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;

  const hash = await clients.walletClient.writeContract({
    address: projectAlignmentContract.address,
    abi: projectAlignmentContract.abi,
    functionName: 'attestAlignment',
    args: [projectAddress, statementId, topicStatementId],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Batch attest multiple project alignments
 *
 * @param topicStatementCids Optional array of topic CIDs for indexer filtering.
 *                           Must have same length as other arrays if provided.
 *                           Pass null/undefined to use no topic for all.
 */
export async function attestProjectAlignmentsBatch(
  clients: TestClients,
  projectAlignmentContract: ProjectAlignmentContract,
  projectAddresses: Address[],
  statementCids: string[],
  topicStatementCids?: (string | null)[] | null
): Promise<Hash> {
  const statementIds = statementCids.map(cidToBytes32);
  const zeroBytes32 = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;
  const topicStatementIds = topicStatementCids
    ? topicStatementCids.map(cid => cid ? cidToBytes32(cid) : zeroBytes32)
    : statementCids.map(() => zeroBytes32);

  const hash = await clients.walletClient.writeContract({
    address: projectAlignmentContract.address,
    abi: projectAlignmentContract.abi,
    functionName: 'attestAlignmentsInBatch',
    args: [projectAddresses, statementIds, topicStatementIds],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
