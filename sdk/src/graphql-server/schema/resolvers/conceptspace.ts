/**
 * Conceptspace GraphQL resolvers
 */

import { IpfsCidV1 } from '../../../cid-types.js';
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
    statement: (_: any, { id }: { id: IpfsCidV1 }, { client }: { client: GraphQLClient }) => {
      return getStatement(client, id);
    },

    userBelief: (_: any, { userAddress, statementCid }: { userAddress: string; statementCid: IpfsCidV1 }, { client }: { client: GraphQLClient }) => {
      return getUserBelief(client, userAddress, statementCid);
    },

    implicationsFrom: (_: any, { statementCid, attesterAddress }: { statementCid: IpfsCidV1; attesterAddress?: string }, { client }: { client: GraphQLClient }) => {
      return getImplicationsFrom(client, statementCid, attesterAddress);
    },

    implicationsTo: (_: any, { statementCid, attesterAddress }: { statementCid: IpfsCidV1; attesterAddress?: string }, { client }: { client: GraphQLClient }) => {
      return getImplicationsTo(client, statementCid, attesterAddress);
    },

    implication: (_: any, { attesterAddress, fromStatementCid, toStatementCid }: { 
      attesterAddress: string; 
      fromStatementCid: IpfsCidV1; 
      toStatementCid: IpfsCidV1; 
    }, { client }: { client: GraphQLClient }) => {
      return getImplication(client, attesterAddress, fromStatementCid, toStatementCid);
    },

    // Complex conceptspace queries
    indirectSupporters: (_: any, { statementCid, attesterAddress }: { statementCid: IpfsCidV1; attesterAddress?: string }, { client }: { client: GraphQLClient }) => {
      return getIndirectSupporters(client, statementCid, attesterAddress);
    },

    indirectSupporterCount: async (_: any, { statementCid, attesterAddress }: { statementCid: IpfsCidV1; attesterAddress?: string }, { client }: { client: GraphQLClient }) => {
      const count = await getIndirectSupporterCount(client, statementCid, attesterAddress);
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

    statementSuggestions: (_: any, { statementCid, attesterAddress }: {
      statementCid: IpfsCidV1;
      attesterAddress?: string;
    }, { client }: { client: GraphQLClient }) => {
      return getStatementSuggestions(client, statementCid, attesterAddress);
    },
  },
};
