/**
 * GraphQL queries for Funding Portals subsystem (AlignmentAttestations)
 *
 * Entity-specific queries use event cache + folds.
 * Aggregated/computed queries use GraphQL.
 */

import { executeTypedGraphQLQuery } from '../../utils/graphqlClient.js';
import { fetchEvents, fetchAlignmentAttestationsRegistry } from '../../utils/eventCacheClient.js';
import { decodeAlignmentAttestationEvent, decodeImplicationAttestationEvent } from '../../utils/eventDecoder.js';
import { foldAlignmentAttestations } from './folds.js';
import {
  GetProjectDetailsDocument,
  GetParticipantSummariesDocument,
} from '../../generated/graphql.js';
import {
  type AlignmentAttestation,
  type IndirectSubjectAlignment,
  type CauseFundingMetrics,
  type ContributorStats,
} from './types.js';
import { IpfsCidV1, normalizeCidV1 } from '../../utils/cid-types.js';
import { SDKMachinery } from '../../machinery.js';

// ============================================================================
// AlignmentAttestation Queries (Event Cache + Folds)
// ============================================================================

/**
 * Get all alignment attestations for a specific statement (by attester if provided)
 */
export async function getAlignedSubjects(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  attesterAddress?: string,
  topicStatementCid?: IpfsCidV1
): Promise<AlignmentAttestation[]> {
  const contracts = machinery.contractAddresses!;
  
  const events = await fetchEvents(machinery, {
    contractAddress: contracts.alignmentAttestations,
    eventName: 'AlignmentAttestation',
    topic1: statementCid,
    limit: 10000,
  });
  
  const decodedEvents = events
    .map(e => decodeAlignmentAttestationEvent(e))
    .filter((e): e is NonNullable<typeof e> => e !== null);
  
  let attestations = foldAlignmentAttestations(decodedEvents);
  
  if (attesterAddress) {
    const attesterLower = attesterAddress.toLowerCase();
    attestations = attestations.filter(a => a.attester.toLowerCase() === attesterLower);
  }
  
  return attestations.map(a => ({
    attester: a.attester,
    subjectAddress: a.subjectAddress,
    statementCid: a.statementCid,
    topicStatementCid,
    createdAt: a.createdAt,
    blockNumber: a.blockNumber,
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
  attesterAddress?: string,
  topicStatementCid?: IpfsCidV1
): Promise<AlignmentAttestation[]> {
  const contracts = machinery.contractAddresses!;
  
  const events = await fetchEvents(machinery, {
    contractAddress: contracts.alignmentAttestations,
    eventName: 'AlignmentAttestation',
    topic2: subjectAddress.toLowerCase(),
    limit: 10000,
  });
  
  const decodedEvents = events
    .map(e => decodeAlignmentAttestationEvent(e))
    .filter((e): e is NonNullable<typeof e> => e !== null);
  
  let attestations = foldAlignmentAttestations(
    decodedEvents.map(e => ({
      ...e,
      topicStatementId: topicStatementCid || '',
      blockNumber: BigInt(0),
      blockTimestamp: BigInt(0),
      transactionHash: '' as `0x${string}`,
      logIndex: 0,
    }))
  );
  
  if (attesterAddress) {
    const attesterLower = attesterAddress.toLowerCase();
    attestations = attestations.filter(a => a.attester.toLowerCase() === attesterLower);
  }
  
  return attestations.map(a => ({
    attester: a.attester,
    subjectAddress: a.subjectAddress,
    statementCid: a.statementCid,
    topicStatementCid,
    createdAt: '',
    blockNumber: '',
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
  statementCid: IpfsCidV1,
  topicStatementCid?: IpfsCidV1
): Promise<AlignmentAttestation | null> {
  const contracts = machinery.contractAddresses!;
  
  const events = await fetchEvents(machinery, {
    contractAddress: contracts.alignmentAttestations,
    eventName: 'AlignmentAttestation',
    topic1: statementCid,
    topic2: subjectAddress.toLowerCase(),
    limit: 1000,
  });
  
  const decodedEvents = events
    .map(e => decodeAlignmentAttestationEvent(e))
    .filter((e): e is NonNullable<typeof e> => e !== null);
  
  const attesterLower = attesterAddress.toLowerCase();
  const matching = decodedEvents.filter(e => e.attester.toLowerCase() === attesterLower);
  
  if (matching.length === 0) {
    return null;
  }
  
  const latest = matching[matching.length - 1];
  return {
    attester: latest.attester,
    subjectAddress: latest.subjectAddress,
    statementCid: latest.statementId as IpfsCidV1,
    topicStatementCid,
    createdAt: '',
    blockNumber: '',
  };
}

// Backwards compatibility alias
export const getProjectAlignment = getAlignmentAttestation;

/**
 * Get all alignments by a specific attester
 */
export async function getAlignmentsByAttester(
  machinery: SDKMachinery,
  attesterAddress: string,
  topicStatementCid?: IpfsCidV1
): Promise<AlignmentAttestation[]> {
  const registry = await fetchAlignmentAttestationsRegistry(machinery, {
    attester: attesterAddress.toLowerCase(),
    limit: 10000,
  });
  
  return registry.map(item => ({
    attester: item.attester,
    subjectAddress: item.subjectAddress,
    statementCid: normalizeCidV1(item.statementId),
    topicStatementCid,
    createdAt: '',
    blockNumber: '',
  }));
}

// ============================================================================
// Indirect Alignment Queries (via Implication Graph) - Mixed approach
// ============================================================================

/**
 * Get subjects that are indirectly aligned with a statement via the implication graph.
 *
 * A subject is indirectly aligned with statement S2 if:
 * - The subject is directly aligned with statement S1
 * - S1 implies S2 (according to a trusted attester)
 */
export async function getIndirectlyAlignedSubjects(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<IndirectSubjectAlignment[]> {
  const contracts = machinery.contractAddresses!;

  const toEvents = await fetchEvents(machinery, {
    contractAddress: contracts.implications,
    eventName: 'ImplicationAttestation',
    topic2: statementCid,
    limit: 10000,
  });

  const decodedImplicationEvents = toEvents.map(e => decodeImplicationAttestationEvent(e)).filter((e): e is NonNullable<typeof e> => e !== null);

  let implications = decodedImplicationEvents;

  if (trustedImplicationAttester) {
    const attesterLower = trustedImplicationAttester.toLowerCase();
    implications = implications.filter(i => i.attester.toLowerCase() === attesterLower);
  }

  if (implications.length === 0) {
    return [];
  }

  const indirectAlignments: IndirectSubjectAlignment[] = [];

  for (const implication of implications) {
    const fromStatementCid = normalizeCidV1(implication.fromStatementCid);
    const alignments = await getAlignedSubjects(
      machinery,
      fromStatementCid,
      trustedAlignmentAttester
    );

    for (const alignment of alignments) {
      indirectAlignments.push({
        subjectAddress: alignment.subjectAddress,
        directStatementCid: fromStatementCid,
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
// Aggregated Funding Metrics (E2) - GraphQL
// ============================================================================

/**
 * Get total funding raised for a cause (across all aligned projects).
 * Includes both direct and indirect alignments.
 */
export async function getTotalFundingForCause(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<CauseFundingMetrics> {
  const allAlignedProjects = await getAllAlignedProjectsForCause(
    machinery,
    statementCid,
    trustedImplicationAttester,
    trustedAlignmentAttester
  );

  let totalRaised = 0n;
  for (const project of allAlignedProjects) {
    totalRaised += BigInt(project.totalReceived);
  }

  const totalAvailable = 0n;

  return {
    totalRaisedAcrossProjects: totalRaised,
    totalAvailableFromNotes: totalAvailable,
    projectCount: allAlignedProjects.length,
    noteCount: 0,
  };
}

/**
 * Get all projects aligned with a cause (both direct and indirect).
 * Returns projects with their alignment type and total raised.
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
  const directAlignments = await getAlignedSubjects(
    machinery,
    statementCid,
    trustedAlignmentAttester
  );

  const indirectAlignments = await getIndirectlyAlignedSubjects(
    machinery,
    statementCid,
    trustedImplicationAttester,
    trustedAlignmentAttester
  );

  const projectMap = new Map<string, 'direct' | 'indirect'>();
  directAlignments.forEach(a =>
    projectMap.set(a.subjectAddress.toLowerCase(), 'direct')
  );
  indirectAlignments.forEach(a => {
    const addr = a.subjectAddress.toLowerCase();
    if (!projectMap.has(addr)) {
      projectMap.set(addr, 'indirect');
    }
  });

  const results = [];
  for (const [projectAddress, alignmentType] of projectMap.entries()) {
    const projectResult = await executeTypedGraphQLQuery(machinery, GetProjectDetailsDocument, {
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
// Contributor Leaderboards (E3) - GraphQL
// ============================================================================

/**
 * Get top contributors for a specific cause (across all aligned projects).
 */
export async function getTopContributorsForCause(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  limit: number = 10,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<ContributorStats[]> {
  const alignedProjects = await getAllAlignedProjectsForCause(
    machinery,
    statementCid,
    trustedImplicationAttester,
    trustedAlignmentAttester
  );

  if (alignedProjects.length === 0) {
    return [];
  }

  const participantMap = new Map<string, ContributorStats>();

  for (const project of alignedProjects) {
    const summariesResult = await executeTypedGraphQLQuery(machinery, GetParticipantSummariesDocument, {
      projectAddress: project.projectAddress.toLowerCase(),
    });

    const summaries = summariesResult.participantSummariess?.items ?? [];

    for (const summary of summaries) {
      const participant = summary.participant.toLowerCase();
      const existing = participantMap.get(participant);

      const totalContributed = BigInt(String(summary.totalContributed));
      const totalRefunded = BigInt(String(summary.totalRefunded));
      const netContribution = BigInt(String(summary.netContribution));
      const firstAt = summary.firstContributionAt != null ? BigInt(String(summary.firstContributionAt)) : undefined;
      const lastAt = summary.lastContributionAt != null ? BigInt(String(summary.lastContributionAt)) : undefined;

      if (existing) {
        existing.totalContributed += totalContributed;
        existing.totalRefunded += totalRefunded;
        existing.netContribution += netContribution;
        existing.contributionCount += summary.contributionCount;
        existing.projectsContributedTo += 1;

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
  const allContributors = await getTopContributorsForCause(
    machinery,
    statementCid,
    1000000,
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
    rank: userIndex + 1,
    stats: allContributors[userIndex],
    totalContributors: allContributors.length,
  };
}
