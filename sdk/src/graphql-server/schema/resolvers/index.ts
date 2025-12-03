/**
 * Combined GraphQL resolvers
 */

import { conceptspaceResolvers } from './conceptspace.js';
import { pubstarterResolvers } from './pubstarter.js';
import { delegationResolvers } from './delegation.js';
import { fundingPortalsResolvers } from './funding-portals.js';
import { mutableRefsResolvers } from './mutable-refs.js';

// Combine all resolvers
export const resolvers = {
  Query: {
    ...conceptspaceResolvers.Query,
    ...pubstarterResolvers.Query,
    ...delegationResolvers.Query,
    ...fundingPortalsResolvers.Query,
    ...mutableRefsResolvers.Query,
  },
  // Type resolvers to handle field mappings
  Contribution: {
    amount: (parent: any) => parent.totalCost || parent.amount,
    timestamp: (parent: any) => parent.createdAt || parent.timestamp,
  },
  // Transform flat ProjectWithMetrics from old queries to nested schema format
  ProjectWithMetrics: {
    project: (parent: any) => {
      // If parent already has a 'project' field, return it
      if (parent.project) {
        return parent.project;
      }
      // Otherwise, construct project from parent fields (old format)
      return {
        id: parent.id,
        totalReceived: parent.totalReceived,
        threshold: parent.threshold,
        deadline: parent.deadline,
        cid: parent.metadataCid || parent.cid,
        title: parent.title,
        description: parent.description,
        createdAt: parent.createdAt,
      };
    },
    totalContributions: (parent: any) => parent.totalContributions || parent.totalReceived || '0',
    contributionCount: (parent: any) => parent.contributionCount || 0,
    activeTokens: (parent: any) => parent.activeTokens || 0,
    fundingProgress: (parent: any) => parent.fundingProgress || 0,
  },
};
