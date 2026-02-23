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
import { SDKMachinery } from '../../../machinery.js';
import { GraphQLClient } from '../../../utils/graphqlClient.js';

export const conceptspaceResolvers = {
  Query: {
    // Simple conceptspace queries
    statement: (_: any, { id }: { id: IpfsCidV1 }, { machinery }: { machinery: SDKMachinery }) => {
      return getStatement(machinery, id);
    },

    userBelief: (_: any, { userAddress, statementCid }: { userAddress: string; statementCid: IpfsCidV1 }, { machinery }: { machinery: SDKMachinery }) => {
      return getUserBelief(machinery, userAddress, statementCid);
    },

    implicationsFrom: (_: any, { statementCid, attesterAddress }: { statementCid: IpfsCidV1; attesterAddress?: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getImplicationsFrom(machinery, statementCid, attesterAddress);
    },

    implicationsTo: (_: any, { statementCid, attesterAddress }: { statementCid: IpfsCidV1; attesterAddress?: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getImplicationsTo(machinery, statementCid, attesterAddress);
    },

    implication: (_: any, { attesterAddress, fromStatementCid, toStatementCid }: { 
      attesterAddress: string; 
      fromStatementCid: IpfsCidV1; 
      toStatementCid: IpfsCidV1; 
    }, { machinery }: { machinery: SDKMachinery }) => {
      return getImplication(machinery, attesterAddress, fromStatementCid, toStatementCid);
    },

    // Complex conceptspace queries
    indirectSupporters: (_: any, { statementCid, attesterAddress }: { statementCid: IpfsCidV1; attesterAddress?: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getIndirectSupporters(machinery, statementCid, attesterAddress);
    },

    indirectSupporterCount: async (_: any, { statementCid, attesterAddress }: { statementCid: IpfsCidV1; attesterAddress?: string }, { machinery }: { machinery: SDKMachinery }) => {
      const count = await getIndirectSupporterCount(machinery, statementCid, attesterAddress);
      return count;
    },

    // Statement browsing
    browseStatementsByMostSupporters: (_: any, { options }: { options?: any }, { machinery }: { machinery: SDKMachinery }) => {
      return browseStatementsByMostSupporters(machinery, options || {});
    },

    browseStatementsByNewest: (_: any, { options }: { options?: any }, { machinery }: { machinery: SDKMachinery }) => {
      return browseStatementsByNewest(machinery, options || {});
    },

    allStatements: (_: any, { options }: { options?: any }, { machinery }: { machinery: SDKMachinery }) => {
      return getAllStatements(machinery, options || {});
    },

    userBeliefs: (_: any, { userAddress }: { userAddress: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getUserBeliefs(machinery, userAddress);
    },

    userDisbeliefs: (_: any, { userAddress }: { userAddress: string }, { machinery }: { machinery: SDKMachinery }) => {
      return getUserDisbeliefs(machinery, userAddress);
    },

    statementSuggestions: (_: any, { statementCid, attesterAddress }: {
      statementCid: IpfsCidV1;
      attesterAddress?: string;
    }, { machinery }: { machinery: SDKMachinery }) => {
      return getStatementSuggestions(machinery, statementCid, attesterAddress);
    },
  },
};
