/**
 * User actions for Funding Portals subsystem (AlignmentAttestations)
 */

import { type Address, type Hash, type Abi } from 'viem';
import { type WriteClients } from '../../utils/ethereum.js';
import { cidToBytes32, IpfsCidV1 } from '../../utils/cid-types.js';

// ============================================================================
// AlignmentAttestations Actions (Funding Portals)
// ============================================================================

export interface AlignmentAttestationsContract {
  address: Address;
  abi: Abi;
}

/**
 * Convert an Ethereum address to a bytes32 subject ID (left-padded).
 * Use this when passing an address as a subject to attestAlignment or hasAttestation.
 * For content ID subjects, use the keccak256 hash directly.
 */
export function toSubjectId(address: Address): `0x${string}` {
  const normalized = address.toLowerCase().replace(/^0x/, '');
  return `0x${'0'.repeat(24)}${normalized}` as `0x${string}`;
}

/**
 * Attest that a subject (project, user, content item, etc.) is aligned with a statement/cause
 *
 * @param subjectId bytes32 subject identifier. For address subjects, use toSubjectId(address).
 *                  For content items, use keccak256 of the canonical content ID.
 * @param topicStatementCid Required topic for indexer filtering.
 *                          Can be a CID string or a bytes32 (like PROJECT_ALIGNMENT_TOPIC).
 *                          Every attestation must explicitly declare its topic.
 */
export async function attestAlignment(
  clients: WriteClients,
  alignmentAttestationsContract: AlignmentAttestationsContract,
  subjectId: `0x${string}`,
  statementCid: IpfsCidV1,
  topicStatementCid: IpfsCidV1
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: alignmentAttestationsContract.address,
    abi: alignmentAttestationsContract.abi,
    functionName: 'attestAlignment',
    args: [subjectId, cidToBytes32(statementCid), cidToBytes32(topicStatementCid)],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Batch attest multiple alignments
 *
 * @param subjectIds Array of bytes32 subject identifiers. For address subjects, use toSubjectId(address).
 * @param statementCids Array of statement CIDs being attested.
 * @param topicStatementCids Required array of topics for indexer filtering.
 *                           Must have same length as other arrays.
 */
/**
 * Attest that a subject/project has delivered value aligned with a statement/cause.
 */
export async function attestSuccess(
  clients: WriteClients,
  alignmentAttestationsContract: AlignmentAttestationsContract,
  subjectId: `0x${string}`,
  statementCid: IpfsCidV1,
  topicStatementCid: IpfsCidV1
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: alignmentAttestationsContract.address,
    abi: alignmentAttestationsContract.abi,
    functionName: 'attestSuccess',
    args: [subjectId, cidToBytes32(statementCid), cidToBytes32(topicStatementCid)],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function attestAlignmentsBatch(
  clients: WriteClients,
  alignmentAttestationsContract: AlignmentAttestationsContract,
  subjectIds: `0x${string}`[],
  statementCids: IpfsCidV1[],
  topicStatementCids: IpfsCidV1[]
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: alignmentAttestationsContract.address,
    abi: alignmentAttestationsContract.abi,
    functionName: 'attestAlignmentsInBatch',
    args: [subjectIds, statementCids.map(cidToBytes32), topicStatementCids.map(cidToBytes32)],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
