/**
 * Mutable Refs GraphQL resolvers
 */

import {
  getUserRef,
  getUserRefs,
  getUserRefHistory,
  getRefsByName,
  type GraphQLClient,
} from '../../../indexer-queries/index.js';

export const mutableRefsResolvers = {
  Query: {
    // Simple mutable ref queries
    mutableRef: (_: any, { owner, name }: { owner: string; name: string }, { client }: { client: GraphQLClient }) => {
      return getUserRef(client, owner, name);
    },

    mutableRefsByOwner: (_: any, { owner }: { owner: string }, { client }: { client: GraphQLClient }) => {
      return getUserRefs(client, owner);
    },

    refUpdateHistory: (_: any, { owner, name, limit }: { owner: string; name: string; limit?: number }, { client }: { client: GraphQLClient }) => {
      return getUserRefHistory(client, owner, name, limit);
    },

    mutableRefsByName: (_: any, { name, limit }: { name: string; limit?: number }, { client }: { client: GraphQLClient }) => {
      return getRefsByName(client, name, limit);
    },
  },
};
