/**
 * Delegation GraphQL resolvers
 */

import { SDKMachinery } from '../../../index.js';
import {
  getNote,
  getNotesByOwner,
  getNotesByRoot,
  getDelegationChain,
} from '../../../indexer-queries/index.js';
import { GraphQLClient } from '../../../utils/graphqlClient.js';

export const delegationResolvers = {
  Query: {
    // Simple delegation queries
    note: (_: any, { id }: { id: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getNote(machinery, id);
    },

    notesByOwner: (_: any, { ownerAddress }: { ownerAddress: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getNotesByOwner(machinery, ownerAddress);
    },

    notesByRoot: (_: any, { rootAddress }: { rootAddress: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getNotesByRoot(machinery, rootAddress);
    },

    delegationChain: (_: any, { noteId }: { noteId: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getDelegationChain(machinery, noteId);
    },
  },
};
