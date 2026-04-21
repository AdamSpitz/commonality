import type { RawEvent } from '../events-common.js';

export interface DirectSupportEvent extends RawEvent {
  user: `0x${string}`;
  statementId: string;   // CIDv1 (decoded from bytes32)
  beliefState: number;   // 0=noOpinion, 1=believes, 2=disbelieves
}

export interface ImplicationAttestationEvent extends RawEvent {
  attester: `0x${string}`;
  fromStatementCid: string;  // CIDv1
  toStatementCid: string;    // CIDv1
  explanationCid: string;    // CIDv1
}

export interface NudgesPublishedEvent extends RawEvent {
  nudger: `0x${string}`;
  publicationCid: string;  // CIDv1
}
