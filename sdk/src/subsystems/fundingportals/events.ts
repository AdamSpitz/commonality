import type { RawEvent } from '../events-common.js';

export interface AlignmentAttestationEvent extends RawEvent {
  attester: `0x${string}`;
  subjectId: `0x${string}`;
  statementId: string;       // CIDv1 (already decoded from bytes32)
  topicStatementId: string;  // CIDv1
}
