/**
 * GraphQL-based funding portals queries
 *
 * These functions use the local GraphQL executor instead of direct indexer queries
 */

import { executeQuery, type GraphQLExecutor } from '../graphql-server/index.js';

// ============================================================================
// Funding Portals Queries
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

/**
 * Get projects aligned with a statement
 */
export async function getAlignedProjects(
  executor: GraphQLExecutor,
  statementId: string,
  attesterAddress?: string
): Promise<ProjectAlignment[]> {
  const result = await executeQuery<{ alignedProjects: ProjectAlignment[] }>(
    executor,
    `
      query GetAlignedProjects($statementId: ID!, $attesterAddress: Address) {
        alignedProjects(statementId: $statementId, attesterAddress: $attesterAddress) {
          attester
          projectAddress
          statementId
          createdAt
          blockNumber
        }
      }
    `,
    { statementId, attesterAddress }
  );

  return result.alignedProjects || [];
}

/**
 * Get statements aligned with a project
 */
export async function getProjectStatements(
  executor: GraphQLExecutor,
  projectAddress: string,
  attesterAddress?: string
): Promise<ProjectAlignment[]> {
  const result = await executeQuery<{ projectStatements: ProjectAlignment[] }>(
    executor,
    `
      query GetProjectStatements($projectAddress: Address!, $attesterAddress: Address) {
        projectStatements(projectAddress: $projectAddress, attesterAddress: $attesterAddress) {
          attester
          projectAddress
          statementId
          createdAt
          blockNumber
        }
      }
    `,
    { projectAddress, attesterAddress }
  );

  return result.projectStatements || [];
}

/**
 * Get a specific project alignment
 */
export async function getProjectAlignment(
  executor: GraphQLExecutor,
  attesterAddress: string,
  projectAddress: string,
  statementId: string
): Promise<ProjectAlignment | null> {
  const result = await executeQuery<{ projectAlignment: ProjectAlignment | null }>(
    executor,
    `
      query GetProjectAlignment(
        $attesterAddress: Address!
        $projectAddress: Address!
        $statementId: ID!
      ) {
        projectAlignment(
          attesterAddress: $attesterAddress
          projectAddress: $projectAddress
          statementId: $statementId
        ) {
          attester
          projectAddress
          statementId
          createdAt
          blockNumber
        }
      }
    `,
    { attesterAddress, projectAddress, statementId }
  );

  return result.projectAlignment;
}

/**
 * Get alignments by attester
 */
export async function getAlignmentsByAttester(
  executor: GraphQLExecutor,
  attesterAddress: string
): Promise<ProjectAlignment[]> {
  const result = await executeQuery<{ alignmentsByAttester: ProjectAlignment[] }>(
    executor,
    `
      query GetAlignmentsByAttester($attesterAddress: Address!) {
        alignmentsByAttester(attesterAddress: $attesterAddress) {
          attester
          projectAddress
          statementId
          createdAt
          blockNumber
        }
      }
    `,
    { attesterAddress }
  );

  return result.alignmentsByAttester || [];
}

/**
 * Get indirectly aligned projects
 */
export async function getIndirectlyAlignedProjects(
  executor: GraphQLExecutor,
  statementId: string,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<IndirectProjectAlignment[]> {
  const result = await executeQuery<{ indirectlyAlignedProjects: IndirectProjectAlignment[] }>(
    executor,
    `
      query GetIndirectlyAlignedProjects(
        $statementId: ID!
        $trustedImplicationAttester: Address
        $trustedAlignmentAttester: Address
      ) {
        indirectlyAlignedProjects(
          statementId: $statementId
          trustedImplicationAttester: $trustedImplicationAttester
          trustedAlignmentAttester: $trustedAlignmentAttester
        ) {
          projectAddress
          directStatementId
          indirectStatementId
          attester
        }
      }
    `,
    { statementId, trustedImplicationAttester, trustedAlignmentAttester }
  );

  return result.indirectlyAlignedProjects || [];
}

/**
 * Get total funding metrics for a cause
 */
export async function getTotalFundingForCause(
  executor: GraphQLExecutor,
  statementId: string,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<CauseFundingMetrics> {
  const result = await executeQuery<{ totalFundingForCause: CauseFundingMetrics }>(
    executor,
    `
      query GetTotalFundingForCause(
        $statementId: ID!
        $trustedImplicationAttester: Address
        $trustedAlignmentAttester: Address
      ) {
        totalFundingForCause(
          statementId: $statementId
          trustedImplicationAttester: $trustedImplicationAttester
          trustedAlignmentAttester: $trustedAlignmentAttester
        ) {
          totalRaisedAcrossProjects
          totalAvailableFromNotes
          projectCount
          noteCount
        }
      }
    `,
    { statementId, trustedImplicationAttester, trustedAlignmentAttester }
  );

  return result.totalFundingForCause || {
    totalRaisedAcrossProjects: 0n,
    totalAvailableFromNotes: 0n,
    projectCount: 0,
    noteCount: 0,
  };
}

/**
 * Get all aligned projects for a cause
 */
export async function getAllAlignedProjectsForCause(
  executor: GraphQLExecutor,
  statementId: string,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<AlignedProjectWithDetails[]> {
  const result = await executeQuery<{ allAlignedProjectsForCause: AlignedProjectWithDetails[] }>(
    executor,
    `
      query GetAllAlignedProjectsForCause(
        $statementId: ID!
        $trustedImplicationAttester: Address
        $trustedAlignmentAttester: Address
      ) {
        allAlignedProjectsForCause(
          statementId: $statementId
          trustedImplicationAttester: $trustedImplicationAttester
          trustedAlignmentAttester: $trustedAlignmentAttester
        ) {
          projectAddress
          alignmentType
          totalReceived
          threshold
          deadline
        }
      }
    `,
    { statementId, trustedImplicationAttester, trustedAlignmentAttester }
  );

  return result.allAlignedProjectsForCause || [];
}

/**
 * Get top contributors for a cause
 */
export async function getTopContributorsForCause(
  executor: GraphQLExecutor,
  statementId: string,
  limit: number = 10,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<ContributorStats[]> {
  const result = await executeQuery<{ topContributorsForCause: ContributorStats[] }>(
    executor,
    `
      query GetTopContributorsForCause(
        $statementId: ID!
        $limit: Int!
        $trustedImplicationAttester: Address
        $trustedAlignmentAttester: Address
      ) {
        topContributorsForCause(
          statementId: $statementId
          limit: $limit
          trustedImplicationAttester: $trustedImplicationAttester
          trustedAlignmentAttester: $trustedAlignmentAttester
        ) {
          participant
          totalContributed
          totalRefunded
          netContribution
          contributionCount
          firstContributionAt
          lastContributionAt
          projectsContributedTo
        }
      }
    `,
    { statementId, limit, trustedImplicationAttester, trustedAlignmentAttester }
  );

  return result.topContributorsForCause || [];
}

/**
 * Get user contribution rank for a cause
 */
export async function getUserContributionRankForCause(
  executor: GraphQLExecutor,
  statementId: string,
  userAddress: string,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<ContributorRankResult | null> {
  const result = await executeQuery<{ userContributionRankForCause: ContributorRankResult | null }>(
    executor,
    `
      query GetUserContributionRankForCause(
        $statementId: ID!
        $userAddress: Address!
        $trustedImplicationAttester: Address
        $trustedAlignmentAttester: Address
      ) {
        userContributionRankForCause(
          statementId: $statementId
          userAddress: $userAddress
          trustedImplicationAttester: $trustedImplicationAttester
          trustedAlignmentAttester: $trustedAlignmentAttester
        ) {
          rank
          stats {
            participant
            totalContributed
            totalRefunded
            netContribution
            contributionCount
            firstContributionAt
            lastContributionAt
            projectsContributedTo
          }
          totalContributors
        }
      }
    `,
    { statementId, userAddress, trustedImplicationAttester, trustedAlignmentAttester }
  );

  return result.userContributionRankForCause;
}
