/**
 * GraphQL queries for Funding Portals subsystem (AlignmentAttestations)
 *
 * Note: The current schema uses projectAlignments/projectAddress naming.
 * The TypeScript API uses the more generic subjectAddress/AlignmentAttestation naming.
 * Field mapping (projectAddress → subjectAddress) is done in this layer.
 * topicStatementId is not present in the current schema and is returned as ''.
 */

import { request } from 'graphql-request';
import { type GraphQLClient } from '../utils/graphqlClient.js';
import {
  GetAlignedSubjectsDocument,
  GetSubjectStatementsDocument,
  GetAlignmentAttestationDocument,
  GetAlignmentsByAttesterDocument,
  GetImplicationsToForFpDocument,
  GetProjectTotalReceivedDocument,
  GetProjectDetailsDocument,
  GetParticipantSummariesDocument,
} from '../generated/graphql.js';
import {
  type AlignmentAttestation,
  type IndirectSubjectAlignment,
  type CauseFundingMetrics,
  type ContributorStats,
} from '../shared/types/funding-portals.js';
import { fakeIpfsCidV1, IpfsCidV1, normalizeCidV1 } from '../cid-types.js';
import { SDKMachinery } from '../machinery.js';

// ============================================================================
// AlignmentAttestation Queries (Funding Portals)
// ============================================================================

/**
 * Get all alignment attestations for a specific statement (by attester if provided)
 */
export async function getAlignedSubjects(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  attesterAddress?: string
): Promise<AlignmentAttestation[]> {
  const variables: { statementId: string; attester?: string } = {
    statementId: statementCid,
  };
  if (attesterAddress) {
    variables.attester = attesterAddress.toLowerCase();
  }
  const result = await request(machinery.graphqlClient.url, GetAlignedSubjectsDocument, variables);
  // Map projectAddress → subjectAddress; topicStatementId not in schema
  return (result.projectAlignmentss?.items ?? []).map(item => ({
    attester: item.attester,
    subjectAddress: item.projectAddress,
    statementCid: normalizeCidV1(item.statementId),
    topicStatementCid: fakeIpfsCidV1('whatever'), // TODO: what should go here?
    createdAt: String(item.createdAt),
    blockNumber: String(item.blockNumber),
  }));
}

// Backwards compatibility alias
export const getAlignedProjects = getAlignedSubjects;

/**
 * Get all statement alignments for a specific subject (by attester if provided)
 */
export async function getSubjectStatements(
  machinery: SDKMachinery,
  subjectAddress: string,
  attesterAddress?: string
): Promise<AlignmentAttestation[]> {
  const variables: { projectAddress: string; attester?: string } = {
    projectAddress: subjectAddress.toLowerCase(),
  };
  if (attesterAddress) {
    variables.attester = attesterAddress.toLowerCase();
  }
  const result = await request(machinery.graphqlClient.url, GetSubjectStatementsDocument, variables);
  // Map projectAddress → subjectAddress; topicStatementId not in schema
  return (result.projectAlignmentss?.items ?? []).map(item => ({
    attester: item.attester,
    subjectAddress: item.projectAddress,
    statementCid: normalizeCidV1(item.statementId),
    topicStatementCid: fakeIpfsCidV1('whatever'), // TODO: what should go here?
    createdAt: String(item.createdAt),
    blockNumber: String(item.blockNumber),
  }));
}

// Backwards compatibility alias
export const getProjectStatements = getSubjectStatements;

/**
 * Get a specific alignment attestation
 */
export async function getAlignmentAttestation(
  machinery: SDKMachinery,
  attesterAddress: string,
  subjectAddress: string,
  statementCid: IpfsCidV1
): Promise<AlignmentAttestation | null> {
  const result = await request(machinery.graphqlClient.url, GetAlignmentAttestationDocument, {
    attester: attesterAddress.toLowerCase(),
    projectAddress: subjectAddress.toLowerCase(),
    statementId: statementCid,
  });
  if (!result.projectAlignments) return null;
  const item = result.projectAlignments;
  return {
    attester: item.attester,
    subjectAddress: item.projectAddress,
    statementCid: normalizeCidV1(item.statementId),
    topicStatementCid: fakeIpfsCidV1('whatever'), // TODO: what should go here?
    createdAt: String(item.createdAt),
    blockNumber: String(item.blockNumber),
  };
}

// Backwards compatibility alias
export const getProjectAlignment = getAlignmentAttestation;

/**
 * Get all alignments by a specific attester
 */
export async function getAlignmentsByAttester(
  machinery: SDKMachinery,
  attesterAddress: string
): Promise<AlignmentAttestation[]> {
  const result = await request(machinery.graphqlClient.url, GetAlignmentsByAttesterDocument, {
    attester: attesterAddress.toLowerCase(),
  });
  // Map projectAddress → subjectAddress; topicStatementId not in schema
  return (result.projectAlignmentss?.items ?? []).map(item => ({
    attester: item.attester,
    subjectAddress: item.projectAddress,
    statementCid: normalizeCidV1(item.statementId),
    topicStatementCid: fakeIpfsCidV1('whatever'), // TODO: what should go here?
    createdAt: String(item.createdAt),
    blockNumber: String(item.blockNumber),
  }));
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
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<IndirectSubjectAlignment[]> {
  // Step 1: Find all statements that imply the target statement
  const implicationsVariables: { toStatementCid: string; attester?: string } = {
    toStatementCid: statementCid,
  };
  if (trustedImplicationAttester) {
    implicationsVariables.attester = trustedImplicationAttester.toLowerCase();
  }
  const implicationsResult = await request(machinery.graphqlClient.url, GetImplicationsToForFpDocument, implicationsVariables);

  const implications = implicationsResult.implicationss?.items ?? [];

  if (implications.length === 0) {
    return [];
  }

  // Step 2: For each implying statement, find subjects aligned with it
  const indirectAlignments: IndirectSubjectAlignment[] = [];

  for (const implication of implications) {
    const alignments = await getAlignedSubjects(
      machinery,
      normalizeCidV1(implication.fromStatementCid),
      trustedAlignmentAttester
    );

    for (const alignment of alignments) {
      indirectAlignments.push({
        subjectAddress: alignment.subjectAddress,
        directStatementCid: normalizeCidV1(implication.fromStatementCid),
        indirectStatementCid: statementCid,
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
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<CauseFundingMetrics> {
  // Get all directly aligned projects
  const directAlignments = await getAlignedSubjects(
    machinery,
    statementCid,
    trustedAlignmentAttester
  );

  // Get all indirectly aligned projects
  const indirectAlignments = await getIndirectlyAlignedSubjects(
    machinery,
    statementCid,
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
    const projectResult = await request(machinery.graphqlClient.url, GetProjectTotalReceivedDocument, {
      id: projectAddress.toLowerCase(),
    });

    if (projectResult.projects) {
      totalRaised += BigInt(String(projectResult.projects.totalReceived));
    }
  }

  // TODO: Re-implement using NoteIntent attestations
  // intendedStatementId has been removed from DelegatableNotes and moved to NoteIntent contract
  // For now, we return 0 for notes until NoteIntent indexing is implemented
  const totalAvailable = 0n;

  return {
    totalRaisedAcrossProjects: totalRaised,
    totalAvailableFromNotes: totalAvailable,
    projectCount: allProjectAddresses.size,
    noteCount: 0,
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
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
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
    machinery,
    statementCid,
    trustedAlignmentAttester
  );

  // Get all indirectly aligned projects
  const indirectAlignments = await getIndirectlyAlignedSubjects(
    machinery,
    statementCid,
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
    const projectResult = await request(machinery.graphqlClient.url, GetProjectDetailsDocument, {
      id: projectAddress.toLowerCase(),
    });

    if (projectResult.projects) {
      const p = projectResult.projects;
      results.push({
        projectAddress: p.id,
        alignmentType,
        totalReceived: String(p.totalReceived),
        threshold: String(p.threshold),
        deadline: String(p.deadline),
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
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  limit: number = 10,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<ContributorStats[]> {
  // Get all aligned projects
  const alignedProjects = await getAllAlignedProjectsForCause(
    machinery,
    statementCid,
    trustedImplicationAttester,
    trustedAlignmentAttester
  );

  if (alignedProjects.length === 0) {
    return [];
  }

  // Aggregate participant summaries across all aligned projects
  const participantMap = new Map<string, ContributorStats>();

  for (const project of alignedProjects) {
    const summariesResult = await request(machinery.graphqlClient.url, GetParticipantSummariesDocument, {
      projectAddress: project.projectAddress.toLowerCase(),
    });

    const summaries = summariesResult.participantSummariess?.items ?? [];

    for (const summary of summaries) {
      const participant = summary.participant.toLowerCase();
      const existing = participantMap.get(participant);

      // BigInt fields come as strings at runtime; convert to bigint for aggregation
      const totalContributed = BigInt(String(summary.totalContributed));
      const totalRefunded = BigInt(String(summary.totalRefunded));
      const netContribution = BigInt(String(summary.netContribution));
      const firstAt = summary.firstContributionAt != null ? BigInt(String(summary.firstContributionAt)) : undefined;
      const lastAt = summary.lastContributionAt != null ? BigInt(String(summary.lastContributionAt)) : undefined;

      if (existing) {
        // Aggregate with existing stats
        existing.totalContributed += totalContributed;
        existing.totalRefunded += totalRefunded;
        existing.netContribution += netContribution;
        existing.contributionCount += summary.contributionCount;
        existing.projectsContributedTo += 1;

        // Update first/last contribution times
        if (firstAt !== undefined) {
          if (!existing.firstContributionAt || firstAt < existing.firstContributionAt) {
            existing.firstContributionAt = firstAt;
          }
        }
        if (lastAt !== undefined) {
          if (!existing.lastContributionAt || lastAt > existing.lastContributionAt) {
            existing.lastContributionAt = lastAt;
          }
        }
      } else {
        // Create new entry
        participantMap.set(participant, {
          participant,
          totalContributed,
          totalRefunded,
          netContribution,
          contributionCount: summary.contributionCount,
          firstContributionAt: firstAt,
          lastContributionAt: lastAt,
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
 * @param machinery SDK machinery instance
 * @param statementId The statement/cause to query
 * @param userAddress The user to find the rank for
 * @param trustedImplicationAttester Optional: filter implications by this attester
 * @param trustedAlignmentAttester Optional: filter alignments by this attester
 */
export async function getUserContributionRankForCause(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
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
    machinery,
    statementCid,
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
