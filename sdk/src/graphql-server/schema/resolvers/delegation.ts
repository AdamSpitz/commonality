/**
 * Delegation GraphQL resolvers
 */

import {
  getNote,
  getNotesByOwner,
  getNotesByRoot,
  getDelegationChain,
  getNotesByStatement,
  type GraphQLClient,
} from '../../../queries/index.js';

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

    delegationChain: (_: any, { fromAddress, toAddress }: { fromAddress: string; toAddress: string }, { client }: { client: GraphQLClient }) => {
      // The underlying function expects a noteId, but the GraphQL schema expects fromAddress/toAddress
      // This is a design mismatch that needs to be resolved.
      // For now, we'll need to find the note that connects these addresses first
      // TODO: Implement proper delegation chain lookup by addresses
      throw new Error('delegationChain resolver needs to be implemented to handle fromAddress/toAddress lookup');
    },

    notesByStatement: (_: any, { statementId }: { statementId: string }, { client }: { client: GraphQLClient }) => {
      return getNotesByStatement(client, statementId);
    },
  },
};
