/**
 * Queries for Funding Portals subsystem (AlignmentAttestations)
 *
 * All queries use event cache + folds + chain reads.
 */

import { fetchEvents } from '../../utils/eventCacheClient.js';
import { decodeAlignmentAttestationEvent, decodeImplicationAttestationEvent } from '../../utils/eventDecoder.js';
import { foldAlignmentAttestations } from './folds.js';
import { getProject, getProjectContributions, getProjectRefunds } from '../pubstarter/queries.js';
import {
  type AlignmentAttestation,
  type IndirectSubjectAlignment,
  type CauseFundingMetrics,
  type ContributorStats,
} from './types.js';
import { IpfsCidV1, normalizeCidV1, cidToBytes32 } from '../../utils/cid-types.js';
import { padAddressAsTopic } from '../../utils/eventCacheClient.js';
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
  
  // AlignmentAttestation(address indexed attester, address indexed subjectAddress, bytes32 indexed statementId, bytes32 topicStatementId)
  // topic1=attester, topic2=subjectAddress, topic3=statementId (bytes32)
  const events = await fetchEvents(machinery, {
    contractAddress: contracts.alignmentAttestations,
    eventName: 'AlignmentAttestation',
    topic3: cidToBytes32(statementCid),
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
    topic2: padAddressAsTopic(subjectAddress),
    limit: 10000,
  });

  const decodedEvents = events
    .map(e => decodeAlignmentAttestationEvent(e))
    .filter((e): e is NonNullable<typeof e> => e !== null);

  let attestations = foldAlignmentAttestations(decodedEvents);

  if (topicStatementCid) {
    const normalizedTopic = topicStatementCid.toLowerCase();
    attestations = attestations.filter(a => {
      const foldedTopic = a.topicStatementCid?.toLowerCase() ?? '';
      return foldedTopic === normalizedTopic || foldedTopic === '';
    });
  }

  if (attesterAddress) {
    const attesterLower = attesterAddress.toLowerCase();
    attestations = attestations.filter(a => a.attester.toLowerCase() === attesterLower);
  }

  return attestations.map(a => ({
    attester: a.attester,
    subjectAddress: a.subjectAddress,
    statementCid: a.statementCid,
    topicStatementCid: a.topicStatementCid || topicStatementCid,
    createdAt: a.createdAt,
    blockNumber: a.blockNumber,
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
    topic3: cidToBytes32(statementCid),
    topic2: padAddressAsTopic(subjectAddress),
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
  const contracts = machinery.contractAddresses!;

  // AlignmentAttestation: topic1=attester, topic2=subjectAddress, topic3=statementId
  const events = await fetchEvents(machinery, {
    contractAddress: contracts.alignmentAttestations,
    eventName: 'AlignmentAttestation',
    topic1: padAddressAsTopic(attesterAddress),
    limit: 10000,
  });

  const decodedEvents = events
    .map(e => decodeAlignmentAttestationEvent(e))
    .filter((e): e is NonNullable<typeof e> => e !== null);

  const attestations = foldAlignmentAttestations(decodedEvents);

  return attestations.map(a => ({
    attester: a.attester,
    subjectAddress: a.subjectAddress,
    statementCid: normalizeCidV1(a.statementCid),
    topicStatementCid,
    createdAt: a.createdAt,
    blockNumber: a.blockNumber,
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

  // ImplicationAttestation: topic1=attester, topic2=fromStatementCid, topic3=toStatementCid (all bytes32)
  const toEvents = await fetchEvents(machinery, {
    contractAddress: contracts.implications,
    eventName: 'ImplicationAttestation',
    topic3: cidToBytes32(statementCid),
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
// Aggregated Funding Metrics (E2) - Event Cache + Chain Reads
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
    const project = await getProject(machinery, projectAddress);

    if (project) {
      results.push({
        projectAddress: project.id,
        alignmentType,
        totalReceived: project.totalReceived,
        threshold: project.threshold,
        deadline: project.deadline,
      });
    }
  }

  return results;
}

// ============================================================================
// Contributor Leaderboards (E3) - Event Cache + Chain Reads
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
    const [contributions, refunds] = await Promise.all([
      getProjectContributions(machinery, project.projectAddress),
      getProjectRefunds(machinery, project.projectAddress),
    ]);

    // Build per-participant refund totals for this project
    const refundsByParticipant = new Map<string, bigint>();
    for (const refund of refunds) {
      const addr = refund.participant.toLowerCase();
      refundsByParticipant.set(addr, (refundsByParticipant.get(addr) ?? 0n) + BigInt(refund.totalRefund));
    }

    // Aggregate contributions per participant for this project
    const projectParticipants = new Map<string, { totalContributed: bigint; count: number; firstAt?: bigint; lastAt?: bigint }>();
    for (const c of contributions) {
      const addr = c.participant.toLowerCase();
      const existing = projectParticipants.get(addr);
      const ts = BigInt(c.createdAt);
      if (existing) {
        existing.totalContributed += BigInt(c.totalCost);
        existing.count += 1;
        if (ts < (existing.firstAt ?? ts + 1n)) existing.firstAt = ts;
        if (ts > (existing.lastAt ?? 0n)) existing.lastAt = ts;
      } else {
        projectParticipants.set(addr, { totalContributed: BigInt(c.totalCost), count: 1, firstAt: ts, lastAt: ts });
      }
    }

    // Merge into the cross-project participantMap
    for (const [participant, stats] of projectParticipants.entries()) {
      const totalRefunded = refundsByParticipant.get(participant) ?? 0n;
      const netContribution = stats.totalContributed - totalRefunded;
      const existing = participantMap.get(participant);

      if (existing) {
        existing.totalContributed += stats.totalContributed;
        existing.totalRefunded += totalRefunded;
        existing.netContribution += netContribution;
        existing.contributionCount += stats.count;
        existing.projectsContributedTo += 1;

        if (stats.firstAt !== undefined) {
          if (!existing.firstContributionAt || stats.firstAt < existing.firstContributionAt) {
            existing.firstContributionAt = stats.firstAt;
          }
        }
        if (stats.lastAt !== undefined) {
          if (!existing.lastContributionAt || stats.lastAt > existing.lastContributionAt) {
            existing.lastContributionAt = stats.lastAt;
          }
        }
      } else {
        participantMap.set(participant, {
          participant,
          totalContributed: stats.totalContributed,
          totalRefunded,
          netContribution,
          contributionCount: stats.count,
          firstContributionAt: stats.firstAt,
          lastContributionAt: stats.lastAt,
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
