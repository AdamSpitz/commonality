/**
 * GraphQL-based funding portals queries
 *
 * All wrapper functions have been removed. Tests should use the graphql-helpers module.
 * This file now only exports type definitions.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface ProjectAlignment {
  attester: string;
  projectAddress: string;
  statementId: string;
  createdAt: string;
  blockNumber: string;
}

export interface IndirectProjectAlignment {
  projectAddress: string;
  directStatementId: string;
  indirectStatementId: string;
  attester: string;
}

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
  firstContributionAt?: string;
  lastContributionAt?: string;
  projectsContributedTo: number;
}

export interface ContributorRankResult {
  rank: number;
  stats: ContributorStats;
  totalContributors: number;
}

export interface AlignedProjectWithDetails {
  projectAddress: string;
  alignmentType: string;
  totalReceived: string;
  threshold: string;
  deadline: string;
}
