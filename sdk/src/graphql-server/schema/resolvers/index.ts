/**
 * Combined GraphQL resolvers
 */

import { conceptspaceResolvers } from './conceptspace.js';
import { pubstarterResolvers } from './pubstarter.js';
import { delegationResolvers } from './delegation.js';
import { fundingPortalsResolvers } from './funding-portals.js';

// Combine all resolvers
export const resolvers = {
  Query: {
    ...conceptspaceResolvers.Query,
    ...pubstarterResolvers.Query,
    ...delegationResolvers.Query,
    ...fundingPortalsResolvers.Query,
  },
};
