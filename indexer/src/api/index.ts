/**
 * Main API Router
 *
 * This module composes the APIs from all logical indexer subsystems.
 * Each subsystem has its own API module that is mounted here.
 *
 * Subsystems:
 * - Concept Space: /conceptspace/* - Statements, beliefs, implications
 * - Pubstarter: /pubstarter/* - Crowdfunding projects, contributions, markets
 * - Delegation: /delegation/* - Delegatable notes, delegation chains
 * - Funding Portal: /fundingportal/* - Project alignments, cross-cutting views
 *
 * The root GraphQL endpoint provides access to all schema tables.
 */

import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { client, graphql } from "ponder";

// Import subsystem APIs
import conceptspaceApi from "../conceptspace/api";
import pubstarterApi from "../pubstarter/api";
import delegationApi from "../delegation/api";
import fundingportalApi from "../fundingportal/api";

// Import background jobs
import { startIpfsSyncJob } from "../conceptspace/utils/ipfsSyncJob";
import { startIpfsSyncJob as startPubstarterIpfsSyncJob } from "../pubstarter/utils/ipfsSyncJob";

const app = new Hono();

// ============================================================================
// ROOT ENDPOINTS
// ============================================================================

// Expose SQL client for direct queries (all tables)
app.use("/sql/*", client({ db, schema }));

// Root GraphQL API (auto-generated from schema - all tables)
app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

// ============================================================================
// SUBSYSTEM ROUTES
// ============================================================================

// Mount Concept Space API at /conceptspace/*
app.route("/conceptspace", conceptspaceApi);

// Mount Pubstarter API at /pubstarter/*
app.route("/pubstarter", pubstarterApi);

// Mount Delegation API at /delegation/*
app.route("/delegation", delegationApi);

// Mount Funding Portal API at /fundingportal/*
app.route("/fundingportal", fundingportalApi);

// ============================================================================
// BACKGROUND JOBS
// ============================================================================

// Start IPFS content sync job for Concept Space
// This periodically retries fetching IPFS content for statements where
// contentFetched = false, providing resilience against gateway failures.
startIpfsSyncJob({
  db,
  log: {
    info: (msg: string) => console.log(`[IPFS Sync - Statements] ${msg}`),
    warn: (msg: string) => console.warn(`[IPFS Sync - Statements] ${msg}`),
    error: (msg: string) => console.error(`[IPFS Sync - Statements] ${msg}`),
  },
});

// Start IPFS metadata sync job for Pubstarter
// This periodically retries fetching IPFS metadata for projects where
// metadataFetched = false, providing resilience against gateway failures.
startPubstarterIpfsSyncJob({
  db,
  log: {
    info: (msg: string) => console.log(`[IPFS Sync - Projects] ${msg}`),
    warn: (msg: string) => console.warn(`[IPFS Sync - Projects] ${msg}`),
    error: (msg: string) => console.error(`[IPFS Sync - Projects] ${msg}`),
  },
});

export default app;
