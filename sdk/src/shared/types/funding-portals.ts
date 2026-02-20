
export interface AlignmentAttestation {
  attester: string;
  subjectAddress: string;
  statementId: string;
  topicStatementId: string;
  createdAt: string;
  blockNumber: string;
}

// Re-export with old name for backwards compatibility
export type ProjectAlignment = AlignmentAttestation;

export interface IndirectSubjectAlignment {
  subjectAddress: string;
  directStatementId: string; // Statement the subject is directly aligned with
  indirectStatementId: string; // Statement we queried for (implied by directStatementId)
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
