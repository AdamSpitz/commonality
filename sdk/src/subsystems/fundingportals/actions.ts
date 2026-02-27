/**
 * User actions for Funding Portals subsystem (AlignmentAttestations)
 */

import { type Address, type Hash, type Abi } from 'viem';
import { type TestClients } from '../../utils/ethereum.js';
import { cidToBytes32, IpfsCidV1 } from '../../utils/cid-types.js';

// ============================================================================
// AlignmentAttestations Actions (Funding Portals)
// ============================================================================

export interface AlignmentAttestationsContract {
  address: Address;
  abi: Abi;
}

/**
 * Attest that a subject (project, user, etc.) is aligned with a statement/cause
 *
 * @param topicStatementCidOrId Required topic for indexer filtering.
 *                              Can be a CID string or a bytes32 (like PROJECT_ALIGNMENT_TOPIC).
 *                              Every attestation must explicitly declare its topic.
 */
export async function attestAlignment(
  clients: TestClients,
  alignmentAttestationsContract: AlignmentAttestationsContract,
  subjectAddress: Address,
  statementCid: IpfsCidV1,
  topicStatementCid: IpfsCidV1
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: alignmentAttestationsContract.address,
    abi: alignmentAttestationsContract.abi,
    functionName: 'attestAlignment',
    args: [subjectAddress, cidToBytes32(statementCid), cidToBytes32(topicStatementCid)],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Batch attest multiple alignments
 *
 * @param topicStatementCidsOrIds Required array of topics for indexer filtering.
 *                                Can be CID strings or bytes32 values.
 *                                Must have same length as other arrays.
 */
export async function attestAlignmentsBatch(
  clients: TestClients,
  alignmentAttestationsContract: AlignmentAttestationsContract,
  subjectAddresses: Address[],
  statementCids: IpfsCidV1[],
  topicStatementCids: IpfsCidV1[]
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: alignmentAttestationsContract.address,
    abi: alignmentAttestationsContract.abi,
    functionName: 'attestAlignmentsInBatch',
    args: [subjectAddresses, statementCids.map(cidToBytes32), topicStatementCids.map(cidToBytes32)],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
