/**
 * Pubstarter GraphQL resolvers
 */

import { SDKMachinery } from '../../../index.js';
import {
  getProject,
  getAllProjects,
  getProjectTokens,
  getProjectContributions,
  getProjectRefunds,
  getUserContributions,
  getSaleListing,
  getActiveSaleListings,
  getBuyOrder,
  getActiveBuyOrders,
  getMarketplaceTrades,
  getTokenTrades,
  getTokenBurns,
  getUserTokenBurns,
  getTokenBurnsByUser,
  getProjectsFiltered,
  getProjectsByDate,
  getProjectsByDeadline,
  getProjectsByFundingGoal,
  getProjectsByFundingProgress,
  getProjectsByAmountRaised,
} from '../../../indexer-queries/index.js';
import { GraphQLClient } from '../../../utils/graphqlClient.js';

export const pubstarterResolvers = {
  Query: {
    // Simple pubstarter queries
    project: (_: any, { id }: { id: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getProject(machinery, id);
    },

    allProjects: (_: any, __: any, { machinery }: { machinery: SDKMachinery }) => {
      return getAllProjects(machinery);
    },

    projectTokens: (_: any, { projectAddress }: { projectAddress: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getProjectTokens(machinery, projectAddress);
    },

    projectContributions: (_: any, { projectAddress }: { projectAddress: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getProjectContributions(machinery, projectAddress);
    },

    projectRefunds: (_: any, { projectAddress }: { projectAddress: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getProjectRefunds(machinery, projectAddress);
    },

    userContributions: (_: any, { userAddress }: { userAddress: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getUserContributions(machinery, userAddress);
    },

    saleListing: (_: any, { marketplaceAddress, listingId }: { marketplaceAddress: string; listingId: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getSaleListing(machinery, marketplaceAddress, BigInt(listingId));
    },

    activeSaleListings: (_: any, { marketplaceAddress }: { marketplaceAddress?: string }, { machinery }: { machinery: SDKMachinery }) => {
      // For now, use a default marketplace address if not provided
      const address = marketplaceAddress || "0x0000000000000000000000000000000000000000";
      return getActiveSaleListings(machinery, address);
    },

    buyOrder: (_: any, { marketplaceAddress, orderId }: { marketplaceAddress: string; orderId: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getBuyOrder(machinery, marketplaceAddress, BigInt(orderId));
    },

    activeBuyOrders: (_: any, { marketplaceAddress }: { marketplaceAddress?: string }, { machinery }: { machinery: SDKMachinery }) => {
      // For now, use a default marketplace address if not provided
      const address = marketplaceAddress || "0x0000000000000000000000000000000000000000";
      return getActiveBuyOrders(machinery, address);
    },

    marketplaceTrades: (_: any, { marketplaceAddress }: { marketplaceAddress?: string }, { machinery }: { machinery: SDKMachinery }) => {
      // For now, use a default marketplace address if not provided
      const address = marketplaceAddress || "0x0000000000000000000000000000000000000000";
      return getMarketplaceTrades(machinery, address);
    },

    tokenTrades: (_: any, { projectAddress, tokenId }: { projectAddress: string; tokenId: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getTokenTrades(machinery, projectAddress, BigInt(tokenId));
    },

    tokenBurns: (_: any, { projectAddress }: { projectAddress: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getTokenBurns(machinery, projectAddress);
    },

    userTokenBurns: (_: any, { userAddress }: { userAddress: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getUserTokenBurns(machinery, userAddress);
    },

    tokenBurnsByUser: (_: any, { projectAddress, userAddress }: { projectAddress: string; userAddress: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getTokenBurnsByUser(machinery, projectAddress, userAddress);
    },

    // Project filtering and sorting
    projectsFiltered: (_: any, { 
      filterOptions, 
      sortField, 
      sortDirection
    }: { 
      filterOptions: any; 
      sortField?: string; 
      sortDirection?: string; 
    }, { machinery }: { machinery: SDKMachinery }) => {
      return getProjectsFiltered(machinery, filterOptions, sortField as any, sortDirection as any);
    },

    projectsByDate: (_: any, { sortDirection }: { sortDirection?: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getProjectsByDate(machinery, sortDirection as any);
    },

    projectsByDeadline: (_: any, { sortDirection }: { sortDirection?: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getProjectsByDeadline(machinery, sortDirection as any);
    },

    projectsByFundingGoal: (_: any, { sortDirection }: { sortDirection?: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getProjectsByFundingGoal(machinery, sortDirection as any);
    },

    projectsByFundingProgress: (_: any, { sortDirection }: { sortDirection?: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getProjectsByFundingProgress(machinery, sortDirection as any);
    },

    projectsByAmountRaised: (_: any, { sortDirection }: { sortDirection?: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getProjectsByAmountRaised(machinery, sortDirection as any);
    },
  },
};
