/**
 * GraphQL queries for Funding Portals subsystem (AlignmentAttestations)
 */

import { query, type GraphQLClient } from '../utils/graphqlClient.js';
import {
  type AlignmentAttestation,
  type IndirectSubjectAlignment,
  type ProjectAlignment,
  type IndirectProjectAlignment,
  type CauseFundingMetrics,
  type ContributorStats,
} from '../shared/types/funding-portals.js';

// ============================================================================
// AlignmentAttestation Queries (Funding Portals)
// ============================================================================

/**
 * Get all alignment attestations for a specific statement (by attester if provided)
 */
export async function getAlignedSubjects(
  client: GraphQLClient,
  statementId: string,
  attesterAddress?: string
): Promise<AlignmentAttestation[]> {
  if (attesterAddress) {
    const result = await query<{ alignmentAttestationss: { items: AlignmentAttestation[] } }>(
      client,
      `
        query GetAlignedSubjects($statementId: String!, $attester: String!) {
          alignmentAttestationss(where: { statementId: $statementId, attester: $attester }) {
            items {
              attester
              subjectAddress
              statementId
              topicStatementId
              createdAt
              blockNumber
            }
          }
        }
      `,
      { statementId: statementId.toLowerCase(), attester: attesterAddress.toLowerCase() }
    );
    return result.alignmentAttestationss?.items || [];
  } else {
    const result = await query<{ alignmentAttestationss: { items: AlignmentAttestation[] } }>(
      client,
      `
        query GetAlignedSubjects($statementId: String!) {
          alignmentAttestationss(where: { statementId: $statementId }) {
            items {
              attester
              subjectAddress
              statementId
              topicStatementId
              createdAt
              blockNumber
            }
          }
        }
      `,
      { statementId: statementId.toLowerCase() }
    );
    return result.alignmentAttestationss?.items || [];
  }
}

// Backwards compatibility alias
export const getAlignedProjects = getAlignedSubjects;

/**
 * Get all statement alignments for a specific subject (by attester if provided)
 */
export async function getSubjectStatements(
  client: GraphQLClient,
  subjectAddress: string,
  attesterAddress?: string
): Promise<AlignmentAttestation[]> {
  if (attesterAddress) {
    const result = await query<{ alignmentAttestationss: { items: AlignmentAttestation[] } }>(
      client,
      `
        query GetSubjectStatements($subjectAddress: String!, $attester: String!) {
          alignmentAttestationss(where: { subjectAddress: $subjectAddress, attester: $attester }) {
            items {
              attester
              subjectAddress
              statementId
              topicStatementId
              createdAt
              blockNumber
            }
          }
        }
      `,
      { subjectAddress: subjectAddress.toLowerCase(), attester: attesterAddress.toLowerCase() }
    );
    return result.alignmentAttestationss?.items || [];
  } else {
    const result = await query<{ alignmentAttestationss: { items: AlignmentAttestation[] } }>(
      client,
      `
        query GetSubjectStatements($subjectAddress: String!) {
          alignmentAttestationss(where: { subjectAddress: $subjectAddress }) {
            items {
              attester
              subjectAddress
              statementId
              topicStatementId
              createdAt
              blockNumber
            }
          }
        }
      `,
      { subjectAddress: subjectAddress.toLowerCase() }
    );
    return result.alignmentAttestationss?.items || [];
  }
}

// Backwards compatibility alias
export const getProjectStatements = getSubjectStatements;

/**
 * Get a specific alignment attestation
 */
export async function getAlignmentAttestation(
  client: GraphQLClient,
  attesterAddress: string,
  subjectAddress: string,
  statementId: string
): Promise<AlignmentAttestation | null> {
  const result = await query<{ alignmentAttestations: AlignmentAttestation | null }>(
    client,
    `
      query GetAlignmentAttestation($attester: String!, $subjectAddress: String!, $statementId: String!) {
        alignmentAttestations(
          attester: $attester,
          subjectAddress: $subjectAddress,
          statementId: $statementId
        ) {
          attester
          subjectAddress
          statementId
          topicStatementId
          createdAt
          blockNumber
        }
      }
    `,
    {
      attester: attesterAddress.toLowerCase(),
      subjectAddress: subjectAddress.toLowerCase(),
      statementId: statementId.toLowerCase()
    }
  );

  return result.alignmentAttestations;
}

// Backwards compatibility alias
export const getProjectAlignment = getAlignmentAttestation;

/**
 * Get all alignments by a specific attester
 */
export async function getAlignmentsByAttester(
  client: GraphQLClient,
  attesterAddress: string
): Promise<AlignmentAttestation[]> {
  const result = await query<{ alignmentAttestationss: { items: AlignmentAttestation[] } }>(
    client,
    `
      query GetAlignmentsByAttester($attester: String!) {
        alignmentAttestationss(where: { attester: $attester }) {
          items {
            attester
            subjectAddress
            statementId
            topicStatementId
            createdAt
            blockNumber
          }
        }
      }
    `,
    { attester: attesterAddress.toLowerCase() }
  );

  return result.alignmentAttestationss?.items || [];
}

// ============================================================================
// Indirect Alignment Queries (via Implication Graph)
// ============================================================================

/**
 * Get subjects that are indirectly aligned with a statement via the implication graph.
 *
 * A subject is indirectly aligned with statement S2 if:
 * - The subject is directly aligned with statement S1
 * - S1 implies S2 (according to a trusted attester)
 *
 * @param client GraphQL client
 * @param statementId The statement to find indirectly aligned subjects for
 * @param trustedImplicationAttester Optional: filter implications by this attester
 * @param trustedAlignmentAttester Optional: filter alignments by this attester
 */
export async function getIndirectlyAlignedSubjects(
  client: GraphQLClient,
  statementId: string,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<IndirectSubjectAlignment[]> {
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

  // Step 2: For each implying statement, find subjects aligned with it
  const indirectAlignments: IndirectSubjectAlignment[] = [];

  for (const implication of implications) {
    const alignments = await getAlignedSubjects(
      client,
      implication.fromStatementId,
      trustedAlignmentAttester
    );

    for (const alignment of alignments) {
      indirectAlignments.push({
        subjectAddress: alignment.subjectAddress,
        directStatementId: implication.fromStatementId,
        indirectStatementId: statementId,
        attester: alignment.attester,
      });
    }
  }

  return indirectAlignments;
}

// Backwards compatibility alias
export const getIndirectlyAlignedProjects = getIndirectlyAlignedSubjects;

// ============================================================================
// Aggregated Funding Metrics (E2)
// ============================================================================

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
  const directAlignments = await getAlignedSubjects(
    client,
    statementId,
    trustedAlignmentAttester
  );

  // Get all indirectly aligned projects
  const indirectAlignments = await getIndirectlyAlignedSubjects(
    client,
    statementId,
    trustedImplicationAttester,
    trustedAlignmentAttester
  );

  // Combine and deduplicate project addresses
  const allProjectAddresses = new Set<string>();
  directAlignments.forEach(a => allProjectAddresses.add(a.subjectAddress.toLowerCase()));
  indirectAlignments.forEach(a => allProjectAddresses.add(a.subjectAddress.toLowerCase()));

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

  // TODO: Re-implement using NoteIntent attestations
  // intendedStatementId has been removed from DelegatableNotes and moved to NoteIntent contract
  // For now, we return 0 for notes until NoteIntent indexing is implemented
  const notes: Array<{ amount: string }> = [];
  const totalAvailable = 0n;

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
  const directAlignments = await getAlignedSubjects(
    client,
    statementId,
    trustedAlignmentAttester
  );

  // Get all indirectly aligned projects
  const indirectAlignments = await getIndirectlyAlignedSubjects(
    client,
    statementId,
    trustedImplicationAttester,
    trustedAlignmentAttester
  );

  // Track which projects are direct vs indirect
  const projectMap = new Map<string, 'direct' | 'indirect'>();
  directAlignments.forEach(a =>
    projectMap.set(a.subjectAddress.toLowerCase(), 'direct')
  );
  indirectAlignments.forEach(a => {
    const addr = a.subjectAddress.toLowerCase();
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
