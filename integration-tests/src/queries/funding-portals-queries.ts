/**
 * GraphQL queries for Funding Portals subsystem (ProjectAlignment)
 */

import { query, type GraphQLClient } from './common.js';

// ============================================================================
// ProjectAlignment Queries (Funding Portals)
// ============================================================================

export interface ProjectAlignment {
  attester: string;
  projectAddress: string;
  statementId: string;
  createdAt: string;
  blockNumber: string;
}

/**
 * Get all project alignments for a specific statement (by attester if provided)
 */
export async function getAlignedProjects(
  client: GraphQLClient,
  statementId: string,
  attesterAddress?: string
): Promise<ProjectAlignment[]> {
  if (attesterAddress) {
    const result = await query<{ projectAlignmentss: { items: ProjectAlignment[] } }>(
      client,
      `
        query GetAlignedProjects($statementId: String!, $attester: String!) {
          projectAlignmentss(where: { statementId: $statementId, attester: $attester }) {
            items {
              attester
              projectAddress
              statementId
              createdAt
              blockNumber
            }
          }
        }
      `,
      { statementId: statementId.toLowerCase(), attester: attesterAddress.toLowerCase() }
    );
    return result.projectAlignmentss?.items || [];
  } else {
    const result = await query<{ projectAlignmentss: { items: ProjectAlignment[] } }>(
      client,
      `
        query GetAlignedProjects($statementId: String!) {
          projectAlignmentss(where: { statementId: $statementId }) {
            items {
              attester
              projectAddress
              statementId
              createdAt
              blockNumber
            }
          }
        }
      `,
      { statementId: statementId.toLowerCase() }
    );
    return result.projectAlignmentss?.items || [];
  }
}

/**
 * Get all statement alignments for a specific project (by attester if provided)
 */
export async function getProjectStatements(
  client: GraphQLClient,
  projectAddress: string,
  attesterAddress?: string
): Promise<ProjectAlignment[]> {
  if (attesterAddress) {
    const result = await query<{ projectAlignmentss: { items: ProjectAlignment[] } }>(
      client,
      `
        query GetProjectStatements($projectAddress: String!, $attester: String!) {
          projectAlignmentss(where: { projectAddress: $projectAddress, attester: $attester }) {
            items {
              attester
              projectAddress
              statementId
              createdAt
              blockNumber
            }
          }
        }
      `,
      { projectAddress: projectAddress.toLowerCase(), attester: attesterAddress.toLowerCase() }
    );
    return result.projectAlignmentss?.items || [];
  } else {
    const result = await query<{ projectAlignmentss: { items: ProjectAlignment[] } }>(
      client,
      `
        query GetProjectStatements($projectAddress: String!) {
          projectAlignmentss(where: { projectAddress: $projectAddress }) {
            items {
              attester
              projectAddress
              statementId
              createdAt
              blockNumber
            }
          }
        }
      `,
      { projectAddress: projectAddress.toLowerCase() }
    );
    return result.projectAlignmentss?.items || [];
  }
}

/**
 * Get a specific project alignment attestation
 */
export async function getProjectAlignment(
  client: GraphQLClient,
  attesterAddress: string,
  projectAddress: string,
  statementId: string
): Promise<ProjectAlignment | null> {
  const result = await query<{ projectAlignments: ProjectAlignment | null }>(
    client,
    `
      query GetProjectAlignment($attester: String!, $projectAddress: String!, $statementId: String!) {
        projectAlignments(
          attester: $attester,
          projectAddress: $projectAddress,
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
    {
      attester: attesterAddress.toLowerCase(),
      projectAddress: projectAddress.toLowerCase(),
      statementId: statementId.toLowerCase()
    }
  );

  return result.projectAlignments;
}

/**
 * Get all alignments by a specific attester
 */
export async function getAlignmentsByAttester(
  client: GraphQLClient,
  attesterAddress: string
): Promise<ProjectAlignment[]> {
  const result = await query<{ projectAlignmentss: { items: ProjectAlignment[] } }>(
    client,
    `
      query GetAlignmentsByAttester($attester: String!) {
        projectAlignmentss(where: { attester: $attester }) {
          items {
            attester
            projectAddress
            statementId
            createdAt
            blockNumber
          }
        }
      }
    `,
    { attester: attesterAddress.toLowerCase() }
  );

  return result.projectAlignmentss?.items || [];
}

// ============================================================================
// Indirect Alignment Queries (via Implication Graph)
// ============================================================================

export interface IndirectProjectAlignment {
  projectAddress: string;
  directStatementId: string; // Statement the project is directly aligned with
  indirectStatementId: string; // Statement we queried for (implied by directStatementId)
  attester: string;
}

/**
 * Get projects that are indirectly aligned with a statement via the implication graph.
 *
 * A project is indirectly aligned with statement S2 if:
 * - The project is directly aligned with statement S1
 * - S1 implies S2 (according to a trusted attester)
 *
 * @param client GraphQL client
 * @param statementId The statement to find indirectly aligned projects for
 * @param trustedImplicationAttester Optional: filter implications by this attester
 * @param trustedAlignmentAttester Optional: filter alignments by this attester
 */
export async function getIndirectlyAlignedProjects(
  client: GraphQLClient,
  statementId: string,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<IndirectProjectAlignment[]> {
  // Step 1: Find all statements that imply the target statement
  const implicationsResult = trustedImplicationAttester
    ? await query<{ implicationss: { items: Array<{ fromStatementId: string; attester: { id: string } }> } }>(
        client,
        `
          query GetImplicationsTo($toStatementId: String!, $attester: String!) {
            implicationss(where: { toStatementId: $toStatementId, attester: $attester }) {
              items {
                fromStatementId
                attester {
                  id
                }
              }
            }
          }
        `,
        { toStatementId: statementId.toLowerCase(), attester: trustedImplicationAttester.toLowerCase() }
      )
    : await query<{ implicationss: { items: Array<{ fromStatementId: string; attester: { id: string } }> } }>(
        client,
        `
          query GetImplicationsTo($toStatementId: String!) {
            implicationss(where: { toStatementId: $toStatementId }) {
              items {
                fromStatementId
                attester {
                  id
                }
              }
            }
          }
        `,
        { toStatementId: statementId.toLowerCase() }
      );

  const implications = implicationsResult.implicationss?.items || [];

  if (implications.length === 0) {
    return [];
  }

  // Step 2: For each implying statement, find projects aligned with it
  const indirectAlignments: IndirectProjectAlignment[] = [];

  for (const implication of implications) {
    const alignments = await getAlignedProjects(
      client,
      implication.fromStatementId,
      trustedAlignmentAttester
    );

    for (const alignment of alignments) {
      indirectAlignments.push({
        projectAddress: alignment.projectAddress,
        directStatementId: implication.fromStatementId,
        indirectStatementId: statementId,
        attester: alignment.attester,
      });
    }
  }

  return indirectAlignments;
}

// ============================================================================
// Aggregated Funding Metrics (E2)
// ============================================================================

export interface CauseFundingMetrics {
  totalRaisedAcrossProjects: bigint;
  totalAvailableFromNotes: bigint;
  projectCount: number;
  noteCount: number;
}

/**
 * Get total funding raised for a cause (across all aligned projects).
 * Includes both direct and indirect alignments.
 *
 * @param client GraphQL client
 * @param statementId The statement/cause to query
 * @param trustedImplicationAttester Optional: filter implications by this attester
 * @param trustedAlignmentAttester Optional: filter alignments by this attester
 */
export async function getTotalFundingForCause(
  client: GraphQLClient,
  statementId: string,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<CauseFundingMetrics> {
  // Get all directly aligned projects
  const directAlignments = await getAlignedProjects(
    client,
    statementId,
    trustedAlignmentAttester
  );

  // Get all indirectly aligned projects
  const indirectAlignments = await getIndirectlyAlignedProjects(
    client,
    statementId,
    trustedImplicationAttester,
    trustedAlignmentAttester
  );

  // Combine and deduplicate project addresses
  const allProjectAddresses = new Set<string>();
  directAlignments.forEach(a => allProjectAddresses.add(a.projectAddress.toLowerCase()));
  indirectAlignments.forEach(a => allProjectAddresses.add(a.projectAddress.toLowerCase()));

  // Fetch project details for all aligned projects
  let totalRaised = 0n;
  for (const projectAddress of allProjectAddresses) {
    const projectResult = await query<{ projects: { totalReceived: string } | null }>(
      client,
      `
        query GetProjectTotalReceived($id: String!) {
          projects(id: $id) {
            totalReceived
          }
        }
      `,
      { id: projectAddress.toLowerCase() }
    );

    if (projectResult.projects) {
      totalRaised += BigInt(projectResult.projects.totalReceived);
    }
  }

  // Get all notes for this statement/cause
  const notesResult = await query<{ delegatableNotess: { items: Array<{ amount: string }> } }>(
    client,
    `
      query GetNotesByStatement($statementId: String!) {
        delegatableNotess(where: {
          intendedStatementId: $statementId,
          active: true
        }) {
          items {
            amount
          }
        }
      }
    `,
    { statementId: statementId.toLowerCase() }
  );

  const notes = notesResult.delegatableNotess?.items || [];
  const totalAvailable = notes.reduce((sum, note) => sum + BigInt(note.amount), 0n);

  return {
    totalRaisedAcrossProjects: totalRaised,
    totalAvailableFromNotes: totalAvailable,
    projectCount: allProjectAddresses.size,
    noteCount: notes.length,
  };
}

/**
 * Get all projects aligned with a cause (both direct and indirect).
 * Returns projects with their alignment type and total raised.
 *
 * @param client GraphQL client
 * @param statementId The statement/cause to query
 * @param trustedImplicationAttester Optional: filter implications by this attester
 * @param trustedAlignmentAttester Optional: filter alignments by this attester
 */
export async function getAllAlignedProjectsForCause(
  client: GraphQLClient,
  statementId: string,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<Array<{
  projectAddress: string;
  alignmentType: 'direct' | 'indirect';
  totalReceived: string;
  threshold: string;
  deadline: string;
}>> {
  // Get all directly aligned projects
  const directAlignments = await getAlignedProjects(
    client,
    statementId,
    trustedAlignmentAttester
  );

  // Get all indirectly aligned projects
  const indirectAlignments = await getIndirectlyAlignedProjects(
    client,
    statementId,
    trustedImplicationAttester,
    trustedAlignmentAttester
  );

  // Track which projects are direct vs indirect
  const projectMap = new Map<string, 'direct' | 'indirect'>();
  directAlignments.forEach(a =>
    projectMap.set(a.projectAddress.toLowerCase(), 'direct')
  );
  indirectAlignments.forEach(a => {
    const addr = a.projectAddress.toLowerCase();
    // Don't override direct with indirect
    if (!projectMap.has(addr)) {
      projectMap.set(addr, 'indirect');
    }
  });

  // Fetch project details
  const results = [];
  for (const [projectAddress, alignmentType] of projectMap.entries()) {
    const projectResult = await query<{
      projects: {
        id: string;
        totalReceived: string;
        threshold: string;
        deadline: string;
      } | null
    }>(
      client,
      `
        query GetProjectDetails($id: String!) {
          projects(id: $id) {
            id
            totalReceived
            threshold
            deadline
          }
        }
      `,
      { id: projectAddress.toLowerCase() }
    );

    if (projectResult.projects) {
      results.push({
        projectAddress: projectResult.projects.id,
        alignmentType,
        totalReceived: projectResult.projects.totalReceived,
        threshold: projectResult.projects.threshold,
        deadline: projectResult.projects.deadline,
      });
    }
  }

  return results;
}

// ============================================================================
// Contributor Leaderboards (E3)
// ============================================================================

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

/**
 * Get top contributors for a specific cause (across all aligned projects).
 *
 * @param client GraphQL client
 * @param statementId The statement/cause to query
 * @param limit Maximum number of contributors to return
 * @param trustedImplicationAttester Optional: filter implications by this attester
 * @param trustedAlignmentAttester Optional: filter alignments by this attester
 */
export async function getTopContributorsForCause(
  client: GraphQLClient,
  statementId: string,
  limit: number = 10,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<ContributorStats[]> {
  // Get all aligned projects
  const alignedProjects = await getAllAlignedProjectsForCause(
    client,
    statementId,
    trustedImplicationAttester,
    trustedAlignmentAttester
  );

  if (alignedProjects.length === 0) {
    return [];
  }

  // Aggregate participant summaries across all aligned projects
  const participantMap = new Map<string, ContributorStats>();

  for (const project of alignedProjects) {
    const summariesResult = await query<{
      participantSummariess: {
        items: Array<{
          participant: string;
          totalContributed: string;
          totalRefunded: string;
          netContribution: string;
          contributionCount: number;
          firstContributionAt: string | null;
          lastContributionAt: string | null;
        }>
      }
    }>(
      client,
      `
        query GetParticipantSummaries($projectAddress: String!) {
          participantSummariess(where: { projectAddress: $projectAddress }) {
            items {
              participant
              totalContributed
              totalRefunded
              netContribution
              contributionCount
              firstContributionAt
              lastContributionAt
            }
          }
        }
      `,
      { projectAddress: project.projectAddress.toLowerCase() }
    );

    const summaries = summariesResult.participantSummariess?.items || [];

    for (const summary of summaries) {
      const participant = summary.participant.toLowerCase();
      const existing = participantMap.get(participant);

      if (existing) {
        // Aggregate with existing stats
        existing.totalContributed += BigInt(summary.totalContributed);
        existing.totalRefunded += BigInt(summary.totalRefunded);
        existing.netContribution += BigInt(summary.netContribution);
        existing.contributionCount += summary.contributionCount;
        existing.projectsContributedTo += 1;

        // Update first/last contribution times
        if (summary.firstContributionAt) {
          const firstAt = BigInt(summary.firstContributionAt);
          if (!existing.firstContributionAt || firstAt < existing.firstContributionAt) {
            existing.firstContributionAt = firstAt;
          }
        }
        if (summary.lastContributionAt) {
          const lastAt = BigInt(summary.lastContributionAt);
          if (!existing.lastContributionAt || lastAt > existing.lastContributionAt) {
            existing.lastContributionAt = lastAt;
          }
        }
      } else {
        // Create new entry
        participantMap.set(participant, {
          participant,
          totalContributed: BigInt(summary.totalContributed),
          totalRefunded: BigInt(summary.totalRefunded),
          netContribution: BigInt(summary.netContribution),
          contributionCount: summary.contributionCount,
          firstContributionAt: summary.firstContributionAt ? BigInt(summary.firstContributionAt) : undefined,
          lastContributionAt: summary.lastContributionAt ? BigInt(summary.lastContributionAt) : undefined,
          projectsContributedTo: 1,
        });
      }
    }
  }

  // Sort by net contribution and return top N
  return Array.from(participantMap.values())
    .sort((a, b) => {
      if (a.netContribution > b.netContribution) return -1;
      if (a.netContribution < b.netContribution) return 1;
      return 0;
    })
    .slice(0, limit);
}

/**
 * Get a user's contribution rank for a specific cause.
 * Returns the user's stats and their rank among all contributors.
 *
 * @param client GraphQL client
 * @param statementId The statement/cause to query
 * @param userAddress The user to find the rank for
 * @param trustedImplicationAttester Optional: filter implications by this attester
 * @param trustedAlignmentAttester Optional: filter alignments by this attester
 */
export async function getUserContributionRankForCause(
  client: GraphQLClient,
  statementId: string,
  userAddress: string,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<{
  rank: number;
  stats: ContributorStats | null;
  totalContributors: number;
} | null> {
  // Get all contributors (we need the full list to calculate rank)
  const allContributors = await getTopContributorsForCause(
    client,
    statementId,
    1000000, // Large limit to get all contributors
    trustedImplicationAttester,
    trustedAlignmentAttester
  );

  const userAddr = userAddress.toLowerCase();
  const userIndex = allContributors.findIndex(c => c.participant.toLowerCase() === userAddr);

  if (userIndex === -1) {
    return {
      rank: 0,
      stats: null,
      totalContributors: allContributors.length,
    };
  }

  return {
    rank: userIndex + 1, // 1-indexed rank
    stats: allContributors[userIndex],
    totalContributors: allContributors.length,
  };
}
