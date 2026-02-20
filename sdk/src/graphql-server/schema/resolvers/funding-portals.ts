/**
 * Funding Portals GraphQL resolvers
 */

import {
  getAlignedSubjects,
  getSubjectStatements,
  getAlignmentAttestation,
  getAlignmentsByAttester,
  getIndirectlyAlignedSubjects,
  getTotalFundingForCause,
  getAllAlignedProjectsForCause,
  getTopContributorsForCause,
  getUserContributionRankForCause,
} from '../../../indexer-queries/index.js';
import { GraphQLClient } from '../../../utils/graphqlClient.js';

export const fundingPortalsResolvers = {
  Query: {
    // Simple funding portals queries
    alignedSubjects: (_: any, { statementId, attesterAddress }: { statementId: string; attesterAddress?: string }, { client }: { client: GraphQLClient }) => {
      return getAlignedSubjects(client, statementId, attesterAddress);
    },

    subjectStatements: (_: any, { subjectAddress, attesterAddress }: { subjectAddress: string; attesterAddress?: string }, { client }: { client: GraphQLClient }) => {
      return getSubjectStatements(client, subjectAddress, attesterAddress);
    },

    alignmentAttestation: (_: any, { attesterAddress, subjectAddress, statementId }: {
      attesterAddress: string;
      subjectAddress: string;
      statementId: string;
    }, { client }: { client: GraphQLClient }) => {
      return getAlignmentAttestation(client, attesterAddress, subjectAddress, statementId);
    },

    alignmentsByAttester: (_: any, { attesterAddress }: { attesterAddress: string }, { client }: { client: GraphQLClient }) => {
      return getAlignmentsByAttester(client, attesterAddress);
    },

    // Complex funding queries
    indirectlyAlignedSubjects: (_: any, {
      statementId,
      trustedImplicationAttester,
      trustedAlignmentAttester
    }: {
      statementId: string;
      trustedImplicationAttester?: string;
      trustedAlignmentAttester?: string;
    }, { client }: { client: GraphQLClient }) => {
      return getIndirectlyAlignedSubjects(client, statementId, trustedImplicationAttester, trustedAlignmentAttester);
    },

    totalFundingForCause: async (_: any, {
      statementId,
      trustedImplicationAttester,
      trustedAlignmentAttester
    }: {
      statementId: string;
      trustedImplicationAttester?: string;
      trustedAlignmentAttester?: string;
    }, { client }: { client: GraphQLClient }) => {
      const metrics = await getTotalFundingForCause(client, statementId, trustedImplicationAttester, trustedAlignmentAttester);

      // Convert BigInt to string for GraphQL serialization
      return {
        ...metrics,
        totalRaisedAcrossProjects: metrics.totalRaisedAcrossProjects.toString(),
        totalAvailableFromNotes: metrics.totalAvailableFromNotes.toString(),
      };
    },

    allAlignedProjectsForCause: (_: any, {
      statementId,
      trustedImplicationAttester,
      trustedAlignmentAttester
    }: {
      statementId: string;
      trustedImplicationAttester?: string;
      trustedAlignmentAttester?: string;
    }, { client }: { client: GraphQLClient }) => {
      return getAllAlignedProjectsForCause(client, statementId, trustedImplicationAttester, trustedAlignmentAttester);
    },

    topContributorsForCause: async (_: any, {
      statementId,
      limit = 10,
      trustedImplicationAttester,
      trustedAlignmentAttester
    }: {
      statementId: string;
      limit?: number;
      trustedImplicationAttester?: string;
      trustedAlignmentAttester?: string;
    }, { client }: { client: GraphQLClient }) => {
      const contributors = await getTopContributorsForCause(client, statementId, limit, trustedImplicationAttester, trustedAlignmentAttester);

      // Convert BigInt values to strings for GraphQL serialization
      return contributors.map(contributor => ({
        ...contributor,
        totalContributed: contributor.totalContributed.toString(),
        totalRefunded: contributor.totalRefunded.toString(),
        netContribution: contributor.netContribution.toString(),
      }));
    },

    userContributionRankForCause: async (_: any, {
      statementId,
      userAddress,
      trustedImplicationAttester,
      trustedAlignmentAttester
    }: {
      statementId: string;
      userAddress: string;
      trustedImplicationAttester?: string;
      trustedAlignmentAttester?: string;
    }, { client }: { client: GraphQLClient }) => {
      const result = await getUserContributionRankForCause(client, statementId, userAddress, trustedImplicationAttester, trustedAlignmentAttester);

      if (!result) {
        return null;
      }

      // Convert BigInt values to strings for GraphQL serialization
      return {
        rank: result.rank,
        totalContributors: result.totalContributors,
        stats: result.stats ? {
          ...result.stats,
          totalContributed: result.stats.totalContributed.toString(),
          totalRefunded: result.stats.totalRefunded.toString(),
          netContribution: result.stats.netContribution.toString(),
        } : null,
      };
    },
  },
};
