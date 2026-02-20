/**
 * Delegation GraphQL resolvers
 */

import {
  getNote,
  getNotesByOwner,
  getNotesByRoot,
  getDelegationChain,
  type GraphQLClient,
} from '../../../indexer-queries/index.js';

export const delegationResolvers = {
  Query: {
    // Simple delegation queries
    note: (_: any, { id }: { id: string }, { client }: { client: GraphQLClient }) => {
      return getNote(client, id);
    },

    notesByOwner: (_: any, { ownerAddress }: { ownerAddress: string }, { client }: { client: GraphQLClient }) => {
      return getNotesByOwner(client, ownerAddress);
    },

    notesByRoot: (_: any, { rootAddress }: { rootAddress: string }, { client }: { client: GraphQLClient }) => {
      return getNotesByRoot(client, rootAddress);
    },

    delegationChain: (_: any, { noteId }: { noteId: string }, { client }: { client: GraphQLClient }) => {
      return getDelegationChain(client, noteId);
    },
  },
};
