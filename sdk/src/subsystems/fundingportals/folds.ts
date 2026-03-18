import type { AlignmentAttestation } from './types.js';
import type { IpfsCidV1 } from '../../utils/cid-types.js';

export interface DecodedAlignmentAttestation {
  attester: `0x${string}`;
  subjectAddress: `0x${string}`;
  statementId: string;
  topicStatementId?: string;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
}

/**
 * Fold AlignmentAttestation events → attestation records.
 * Key = (attester, subjectAddress, statementId).
 * Re-attestation updates topicStatementCid; createdAt and blockNumber are set from the first event.
 *
 * Caller is responsible for filtering events to a single subject address
 * (funding portal) before calling this function.
 */
export function foldAlignmentAttestations(events: DecodedAlignmentAttestation[]): AlignmentAttestation[] {
  const map = new Map<string, AlignmentAttestation>();

  for (const e of events) {
    const key = `${e.attester.toLowerCase()}-${e.subjectAddress.toLowerCase()}-${e.statementId}`;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        attester: e.attester,
        subjectAddress: e.subjectAddress,
        statementCid: e.statementId as IpfsCidV1,
        topicStatementCid: (e.topicStatementId || '') as IpfsCidV1,
        createdAt: e.blockTimestamp.toString(),
        blockNumber: e.blockNumber.toString(),
      });
    } else if (e.topicStatementId) {
      existing.topicStatementCid = e.topicStatementId as IpfsCidV1;
    }
  }

  return [...map.values()];
}
