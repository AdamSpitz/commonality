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
 */
export async function attestProjectAlignment(
  clients: TestClients,
  projectAlignmentContract: ProjectAlignmentContract,
  projectAddress: Address,
  statementCid: string
): Promise<Hash> {
  const statementId = cidToBytes32(statementCid);

  const hash = await clients.walletClient.writeContract({
    address: projectAlignmentContract.address,
    abi: projectAlignmentContract.abi,
    functionName: 'attestAlignment',
    args: [projectAddress, statementId],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Batch attest multiple project alignments
 */
export async function attestProjectAlignmentsBatch(
  clients: TestClients,
  projectAlignmentContract: ProjectAlignmentContract,
  projectAddresses: Address[],
  statementCids: string[]
): Promise<Hash> {
  const statementIds = statementCids.map(cidToBytes32);

  const hash = await clients.walletClient.writeContract({
    address: projectAlignmentContract.address,
    abi: projectAlignmentContract.abi,
    functionName: 'attestAlignmentsInBatch',
    args: [projectAddresses, statementIds],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
