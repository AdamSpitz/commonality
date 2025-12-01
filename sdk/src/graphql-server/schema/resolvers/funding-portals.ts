/**
 * Funding Portals GraphQL resolvers
 */

import {
  getAlignedProjects,
  getProjectStatements,
  getProjectAlignment,
  getAlignmentsByAttester,
  getIndirectlyAlignedProjects,
  getTotalFundingForCause,
  getAllAlignedProjectsForCause,
  getTopContributorsForCause,
  getUserContributionRankForCause,
  type GraphQLClient,
} from '../../../queries/index.js';

export const fundingPortalsResolvers = {
  Query: {
    // Simple funding portals queries
    alignedProjects: (_: any, { statementId, attesterAddress }: { statementId: string; attesterAddress?: string }, { client }: { client: GraphQLClient }) => {
      return getAlignedProjects(client, statementId, attesterAddress);
    },

    projectStatements: (_: any, { projectAddress, attesterAddress }: { projectAddress: string; attesterAddress?: string }, { client }: { client: GraphQLClient }) => {
      return getProjectStatements(client, projectAddress, attesterAddress);
    },

    projectAlignment: (_: any, { attesterAddress, projectAddress, statementId }: { 
      attesterAddress: string; 
      projectAddress: string; 
      statementId: string; 
    }, { client }: { client: GraphQLClient }) => {
      return getProjectAlignment(client, attesterAddress, projectAddress, statementId);
    },

    alignmentsByAttester: (_: any, { attesterAddress }: { attesterAddress: string }, { client }: { client: GraphQLClient }) => {
      return getAlignmentsByAttester(client, attesterAddress);
    },

    // Complex funding queries
    indirectlyAlignedProjects: (_: any, { 
      statementId, 
      trustedImplicationAttester, 
      trustedAlignmentAttester 
    }: { 
      statementId: string; 
      trustedImplicationAttester?: string; 
      trustedAlignmentAttester?: string; 
    }, { client }: { client: GraphQLClient }) => {
      return getIndirectlyAlignedProjects(client, statementId, trustedImplicationAttester, trustedAlignmentAttester);
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
