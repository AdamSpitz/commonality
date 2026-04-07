import { IpfsCidV1 } from "../../utils/cid-types.js";

export interface AlignmentAttestation {
  attester: string;
  subjectId: string;
  statementCid: IpfsCidV1;
  topicStatementCid?: IpfsCidV1;
  createdAt: string;
  blockNumber: string;
}

// Re-export with old name for backwards compatibility
export type ProjectAlignment = AlignmentAttestation;

export interface IndirectSubjectAlignment {
  subjectId: string;
  directStatementCid: IpfsCidV1; // Statement the subject is directly aligned with
  indirectStatementCid: IpfsCidV1; // Statement we queried for (implied by directStatementCid)
  attester: string;
}

// Backwards compatibility alias
export type IndirectProjectAlignment = IndirectSubjectAlignment;

export interface CauseFundingMetrics {
  totalRaisedAcrossProjects: bigint;
  totalAvailableFromNotes: bigint;
  projectCount: number;
  noteCount: number;
}


export interface ContributorStats {
  participant: string;
  totalContributed: bigint;
  totalRefunded: bigint;
  netContribution: bigint;
  contributionCount: number;
  firstContributionAt?: bigint;
  lastContributionAt?: bigint;
  projectsContributedTo: number;
}
