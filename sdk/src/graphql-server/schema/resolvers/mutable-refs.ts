/**
 * Mutable Refs GraphQL resolvers
 */

import {
  getUserRef,
  getUserRefs,
  getUserRefHistory,
  getRefsByName,
} from '../../../indexer-queries/index.js';
import { SDKMachinery } from '../../../machinery.js';
import { GraphQLClient } from '../../../utils/graphqlClient.js';

export const mutableRefsResolvers = {
  Query: {
    // Simple mutable ref queries
    mutableRef: (_: any, { owner, name }: { owner: string; name: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getUserRef(machinery, owner, name);
    },

    mutableRefsByOwner: (_: any, { owner }: { owner: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getUserRefs(machinery, owner);
    },

    refUpdateHistory: (_: any, { owner, name, limit }: { owner: string; name: string; limit?: number }, { machinery }: { machinery: SDKMachinery }) => {
      return getUserRefHistory(machinery, owner, name, limit);
    },

    mutableRefsByName: (_: any, { name, limit }: { name: string; limit?: number }, { machinery }: { machinery: SDKMachinery }) => {
      return getRefsByName(machinery, name, limit);
    },
  },
};
