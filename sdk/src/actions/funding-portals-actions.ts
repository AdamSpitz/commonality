/**
 * User actions for Funding Portals subsystem (AlignmentAttestations)
 */

import { type Address, type Hash } from 'viem';
import { type TestClients } from './common.js';
import { cidToBytes32 } from '../cid-types.js';

// ============================================================================
// AlignmentAttestations Actions (Funding Portals)
// ============================================================================

export interface AlignmentAttestationsContract {
  address: Address;
  abi: any;
}

/**
 * Convert a CID string or bytes32 to bytes32
 * If the input is already a 0x-prefixed 66-character hex string, return it as-is.
 * Otherwise, parse it as a CID and convert to bytes32.
 */
function toBytes32(cidOrBytes32: string): `0x${string}` {
  if (cidOrBytes32.startsWith('0x') && cidOrBytes32.length === 66) {
    return cidOrBytes32 as `0x${string}`;
  }
  return cidToBytes32(cidOrBytes32);
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
  statementCid: string,
  topicStatementCidOrId: string
): Promise<Hash> {
  const statementId = cidToBytes32(statementCid);
  const topicStatementId = toBytes32(topicStatementCidOrId);

  const hash = await clients.walletClient.writeContract({
    address: alignmentAttestationsContract.address,
    abi: alignmentAttestationsContract.abi,
    functionName: 'attestAlignment',
    args: [subjectAddress, statementId, topicStatementId],
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
  statementCids: string[],
  topicStatementCidsOrIds: string[]
): Promise<Hash> {
  const statementIds = statementCids.map(cidToBytes32);
  const topicStatementIds = topicStatementCidsOrIds.map(toBytes32);

  const hash = await clients.walletClient.writeContract({
    address: alignmentAttestationsContract.address,
    abi: alignmentAttestationsContract.abi,
    functionName: 'attestAlignmentsInBatch',
    args: [subjectAddresses, statementIds, topicStatementIds],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
