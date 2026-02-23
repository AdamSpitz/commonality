/**
 * Funding Portals GraphQL resolvers
 */

import { IpfsCidV1 } from '../../../cid-types.js';
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
    alignedSubjects: (_: any, { statementCid, attesterAddress }: { statementCid: IpfsCidV1; attesterAddress?: string }, { client }: { client: GraphQLClient }) => {
      return getAlignedSubjects(client, statementCid, attesterAddress);
    },

    subjectStatements: (_: any, { subjectAddress, attesterAddress }: { subjectAddress: string; attesterAddress?: string }, { client }: { client: GraphQLClient }) => {
      return getSubjectStatements(client, subjectAddress, attesterAddress);
    },

    alignmentAttestation: (_: any, { attesterAddress, subjectAddress, statementCid }: {
      attesterAddress: string;
      subjectAddress: string;
      statementCid: IpfsCidV1;
    }, { client }: { client: GraphQLClient }) => {
      return getAlignmentAttestation(client, attesterAddress, subjectAddress, statementCid);
    },

    alignmentsByAttester: (_: any, { attesterAddress }: { attesterAddress: string }, { client }: { client: GraphQLClient }) => {
      return getAlignmentsByAttester(client, attesterAddress);
    },

    // Complex funding queries
    indirectlyAlignedSubjects: (_: any, {
      statementCid,
      trustedImplicationAttester,
      trustedAlignmentAttester
    }: {
      statementCid: IpfsCidV1;
      trustedImplicationAttester?: string;
      trustedAlignmentAttester?: string;
    }, { client }: { client: GraphQLClient }) => {
      return getIndirectlyAlignedSubjects(client, statementCid, trustedImplicationAttester, trustedAlignmentAttester);
    },

    totalFundingForCause: async (_: any, {
      statementCid,
      trustedImplicationAttester,
      trustedAlignmentAttester
    }: {
      statementCid: IpfsCidV1;
      trustedImplicationAttester?: string;
      trustedAlignmentAttester?: string;
    }, { client }: { client: GraphQLClient }) => {
      const metrics = await getTotalFundingForCause(client, statementCid, trustedImplicationAttester, trustedAlignmentAttester);

      // Convert BigInt to string for GraphQL serialization
      return {
        ...metrics,
        totalRaisedAcrossProjects: metrics.totalRaisedAcrossProjects.toString(),
        totalAvailableFromNotes: metrics.totalAvailableFromNotes.toString(),
      };
    },

    allAlignedProjectsForCause: (_: any, {
      statementCid,
      trustedImplicationAttester,
      trustedAlignmentAttester
    }: {
      statementCid: IpfsCidV1;
      trustedImplicationAttester?: string;
      trustedAlignmentAttester?: string;
    }, { client }: { client: GraphQLClient }) => {
      return getAllAlignedProjectsForCause(client, statementCid, trustedImplicationAttester, trustedAlignmentAttester);
    },

    topContributorsForCause: async (_: any, {
      statementCid,
      limit = 10,
      trustedImplicationAttester,
      trustedAlignmentAttester
    }: {
      statementCid: IpfsCidV1;
      limit?: number;
      trustedImplicationAttester?: string;
      trustedAlignmentAttester?: string;
    }, { client }: { client: GraphQLClient }) => {
      const contributors = await getTopContributorsForCause(client, statementCid, limit, trustedImplicationAttester, trustedAlignmentAttester);

      // Convert BigInt values to strings for GraphQL serialization
      return contributors.map(contributor => ({
        ...contributor,
        totalContributed: contributor.totalContributed.toString(),
        totalRefunded: contributor.totalRefunded.toString(),
        netContribution: contributor.netContribution.toString(),
      }));
    },

    userContributionRankForCause: async (_: any, {
      statementCid,
      userAddress,
      trustedImplicationAttester,
      trustedAlignmentAttester
    }: {
      statementCid: IpfsCidV1;
      userAddress: string;
      trustedImplicationAttester?: string;
      trustedAlignmentAttester?: string;
    }, { client }: { client: GraphQLClient }) => {
      const result = await getUserContributionRankForCause(client, statementCid, userAddress, trustedImplicationAttester, trustedAlignmentAttester);

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
