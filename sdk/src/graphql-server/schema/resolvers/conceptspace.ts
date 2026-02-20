/**
 * Conceptspace GraphQL resolvers
 */

import {
  getStatement,
  getUserBelief,
  getImplicationsFrom,
  getImplicationsTo,
  getImplication,
  getIndirectSupporters,
  getIndirectSupporterCount,
  browseStatementsByMostSupporters,
  browseStatementsByNewest,
  getAllStatements,
  getUserBeliefs,
  getUserDisbeliefs,
  getStatementSuggestions,
} from '../../../indexer-queries/index.js';
import { GraphQLClient } from '../../../utils/graphqlClient.js';

export const conceptspaceResolvers = {
  Query: {
    // Simple conceptspace queries
    statement: (_: any, { id }: { id: string }, { client }: { client: GraphQLClient }) => {
      return getStatement(client, id);
    },

    userBelief: (_: any, { userAddress, statementId }: { userAddress: string; statementId: string }, { client }: { client: GraphQLClient }) => {
      return getUserBelief(client, userAddress, statementId);
    },

    implicationsFrom: (_: any, { statementId, attesterAddress }: { statementId: string; attesterAddress?: string }, { client }: { client: GraphQLClient }) => {
      return getImplicationsFrom(client, statementId, attesterAddress);
    },

    implicationsTo: (_: any, { statementId, attesterAddress }: { statementId: string; attesterAddress?: string }, { client }: { client: GraphQLClient }) => {
      return getImplicationsTo(client, statementId, attesterAddress);
    },

    implication: (_: any, { attesterAddress, fromStatementId, toStatementId }: { 
      attesterAddress: string; 
      fromStatementId: string; 
      toStatementId: string; 
    }, { client }: { client: GraphQLClient }) => {
      return getImplication(client, attesterAddress, fromStatementId, toStatementId);
    },

    // Complex conceptspace queries
    indirectSupporters: (_: any, { statementId, attesterAddress }: { statementId: string; attesterAddress?: string }, { client }: { client: GraphQLClient }) => {
      return getIndirectSupporters(client, statementId, attesterAddress);
    },

    indirectSupporterCount: async (_: any, { statementId, attesterAddress }: { statementId: string; attesterAddress?: string }, { client }: { client: GraphQLClient }) => {
      const count = await getIndirectSupporterCount(client, statementId, attesterAddress);
      return count;
    },

    // Statement browsing
    browseStatementsByMostSupporters: (_: any, { options }: { options?: any }, { client }: { client: GraphQLClient }) => {
      return browseStatementsByMostSupporters(client, options || {});
    },

    browseStatementsByNewest: (_: any, { options }: { options?: any }, { client }: { client: GraphQLClient }) => {
      return browseStatementsByNewest(client, options || {});
    },

    allStatements: (_: any, { options }: { options?: any }, { client }: { client: GraphQLClient }) => {
      return getAllStatements(client, options || {});
    },

    userBeliefs: (_: any, { userAddress }: { userAddress: string }, { client }: { client: GraphQLClient }) => {
      return getUserBeliefs(client, userAddress);
    },

    userDisbeliefs: (_: any, { userAddress }: { userAddress: string }, { client }: { client: GraphQLClient }) => {
      return getUserDisbeliefs(client, userAddress);
    },

    statementSuggestions: (_: any, { statementId, attesterAddress }: {
      statementId: string;
      attesterAddress?: string;
    }, { client }: { client: GraphQLClient }) => {
      return getStatementSuggestions(client, statementId, attesterAddress);
    },
  },
};
