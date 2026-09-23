import type { AlignmentAttestation } from './types.js';
import type { IpfsCidV1 } from '../../utils/cid-types.js';

export interface DecodedAlignmentAttestation {
  attester: `0x${string}`;
  subjectId: `0x${string}`;
  statementId: string;
  topicStatementId?: string;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
  revoked?: false;
}

export interface DecodedAlignmentRevocation {
  attester: `0x${string}`;
  subjectId: `0x${string}`;
  statementId: string;
  topicStatementId?: string;
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
  revoked: true;
}

/**
 * Fold alignment attestations and revocations → active records.
 * Key = (attester, subjectId, statementId, topicStatementId). Events are applied in chain order,
 * regardless of event-cache response order.
 */
export function foldAlignmentAttestations(
  events: Array<DecodedAlignmentAttestation | DecodedAlignmentRevocation>,
): AlignmentAttestation[] {
  const map = new Map<string, AlignmentAttestation>();
  const ordered = [...events].sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) return a.blockNumber < b.blockNumber ? -1 : 1;
    return a.logIndex - b.logIndex;
  });

  for (const e of ordered) {
    const key = [
      e.attester.toLowerCase(),
      e.subjectId.toLowerCase(),
      e.statementId.toLowerCase(),
      (e.topicStatementId ?? '').toLowerCase(),
    ].join('-');
    if (e.revoked === true) {
      map.delete(key);
      continue;
    }

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        attester: e.attester,
        subjectId: e.subjectId,
        statementCid: e.statementId as IpfsCidV1,
        topicStatementCid: (e.topicStatementId || '') as IpfsCidV1,
        createdAt: e.blockTimestamp.toString(),
        blockNumber: e.blockNumber.toString(),
      });
    }
  }

  return [...map.values()];
}
