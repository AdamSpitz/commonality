/**
 * Pubstarter GraphQL resolvers
 */

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
    project: (_: any, { id }: { id: string }, { client }: { client: GraphQLClient }) => {
      return getProject(client, id);
    },

    allProjects: (_: any, __: any, { client }: { client: GraphQLClient }) => {
      return getAllProjects(client);
    },

    projectTokens: (_: any, { projectAddress }: { projectAddress: string }, { client }: { client: GraphQLClient }) => {
      return getProjectTokens(client, projectAddress);
    },

    projectContributions: (_: any, { projectAddress }: { projectAddress: string }, { client }: { client: GraphQLClient }) => {
      return getProjectContributions(client, projectAddress);
    },

    projectRefunds: (_: any, { projectAddress }: { projectAddress: string }, { client }: { client: GraphQLClient }) => {
      return getProjectRefunds(client, projectAddress);
    },

    userContributions: (_: any, { userAddress }: { userAddress: string }, { client }: { client: GraphQLClient }) => {
      return getUserContributions(client, userAddress);
    },

    saleListing: (_: any, { marketplaceAddress, listingId }: { marketplaceAddress: string; listingId: string }, { client }: { client: GraphQLClient }) => {
      return getSaleListing(client, marketplaceAddress, BigInt(listingId));
    },

    activeSaleListings: (_: any, { marketplaceAddress }: { marketplaceAddress?: string }, { client }: { client: GraphQLClient }) => {
      // For now, use a default marketplace address if not provided
      const address = marketplaceAddress || "0x0000000000000000000000000000000000000000";
      return getActiveSaleListings(client, address);
    },

    buyOrder: (_: any, { marketplaceAddress, orderId }: { marketplaceAddress: string; orderId: string }, { client }: { client: GraphQLClient }) => {
      return getBuyOrder(client, marketplaceAddress, BigInt(orderId));
    },

    activeBuyOrders: (_: any, { marketplaceAddress }: { marketplaceAddress?: string }, { client }: { client: GraphQLClient }) => {
      // For now, use a default marketplace address if not provided
      const address = marketplaceAddress || "0x0000000000000000000000000000000000000000";
      return getActiveBuyOrders(client, address);
    },

    marketplaceTrades: (_: any, { marketplaceAddress }: { marketplaceAddress?: string }, { client }: { client: GraphQLClient }) => {
      // For now, use a default marketplace address if not provided
      const address = marketplaceAddress || "0x0000000000000000000000000000000000000000";
      return getMarketplaceTrades(client, address);
    },

    tokenTrades: (_: any, { projectAddress, tokenId }: { projectAddress: string; tokenId: string }, { client }: { client: GraphQLClient }) => {
      return getTokenTrades(client, projectAddress, BigInt(tokenId));
    },

    tokenBurns: (_: any, { projectAddress }: { projectAddress: string }, { client }: { client: GraphQLClient }) => {
      return getTokenBurns(client, projectAddress);
    },

    userTokenBurns: (_: any, { userAddress }: { userAddress: string }, { client }: { client: GraphQLClient }) => {
      return getUserTokenBurns(client, userAddress);
    },

    tokenBurnsByUser: (_: any, { projectAddress, userAddress }: { projectAddress: string; userAddress: string }, { client }: { client: GraphQLClient }) => {
      return getTokenBurnsByUser(client, projectAddress, userAddress);
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
    }, { client }: { client: GraphQLClient }) => {
      return getProjectsFiltered(client, filterOptions, sortField as any, sortDirection as any);
    },

    projectsByDate: (_: any, { sortDirection }: { sortDirection?: string }, { client }: { client: GraphQLClient }) => {
      return getProjectsByDate(client, sortDirection as any);
    },

    projectsByDeadline: (_: any, { sortDirection }: { sortDirection?: string }, { client }: { client: GraphQLClient }) => {
      return getProjectsByDeadline(client, sortDirection as any);
    },

    projectsByFundingGoal: (_: any, { sortDirection }: { sortDirection?: string }, { client }: { client: GraphQLClient }) => {
      return getProjectsByFundingGoal(client, sortDirection as any);
    },

    projectsByFundingProgress: (_: any, { sortDirection }: { sortDirection?: string }, { client }: { client: GraphQLClient }) => {
      return getProjectsByFundingProgress(client, sortDirection as any);
    },

    projectsByAmountRaised: (_: any, { sortDirection }: { sortDirection?: string }, { client }: { client: GraphQLClient }) => {
      return getProjectsByAmountRaised(client, sortDirection as any);
    },
  },
};
