import type { AlignmentAttestation } from './types.js';
import type { AlignmentAttestationEvent } from './events.js';
import type { IpfsCidV1 } from '../../utils/cid-types.js';

/**
 * Fold AlignmentAttestation events → attestation records.
 * Key = (attester, subjectAddress, statementId).
 * Re-attestation updates topicStatementCid; createdAt and blockNumber are set from the first event.
 */
export function foldAlignmentAttestations(events: AlignmentAttestationEvent[]): AlignmentAttestation[] {
  const map = new Map<string, AlignmentAttestation>();

  for (const e of events) {
    const key = `${e.attester.toLowerCase()}-${e.subjectAddress.toLowerCase()}-${e.statementId}`;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        attester: e.attester,
        subjectAddress: e.subjectAddress,
        statementCid: e.statementId as IpfsCidV1,
        topicStatementCid: e.topicStatementId as IpfsCidV1,
        createdAt: e.blockTimestamp.toString(),
        blockNumber: e.blockNumber.toString(),
      });
    } else {
      existing.topicStatementCid = e.topicStatementId as IpfsCidV1;
    }
  }

  return [...map.values()];
}
