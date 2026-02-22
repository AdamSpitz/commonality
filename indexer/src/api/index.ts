/**
 * Main API Router
 *
 * This module composes the APIs from all logical indexer subsystems.
 * Each subsystem has its own API module that is mounted here.
 * 
 * The root GraphQL endpoint provides access to all schema tables.
 */

import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { client, graphql } from "ponder";

// Import subsystem API factories
import { createConceptspaceApi } from "../conceptspace/api";
import { createPubstarterApi } from "../pubstarter/api";
import { createDelegationApi } from "../delegation/api";
import { createFundingportalApi } from "../fundingportal/api";

// Import background jobs
import { startIpfsSyncJobs } from "../utils/ipfsSyncJob.js";
import { runPubstarterIpfsSyncIteration } from "../pubstarter/utils/ipfsSyncJob";
import { runConceptspaceIpfsSyncIteration } from "../conceptspace/utils/ipfsSyncJob.js";

const IPFS_GATEWAY = process.env.IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs";

const app = new Hono();

// Expose SQL client for direct queries (all tables)
app.use("/sql/*", client({ db, schema }));

// Root GraphQL API (auto-generated from schema - all tables)
app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

// Subsystems
app.route("/conceptspace", createConceptspaceApi(db, schema));
app.route("/pubstarter", createPubstarterApi(db, schema));
app.route("/delegation", createDelegationApi(db, schema));
app.route("/fundingportal", createFundingportalApi(db, schema));

// Background IPFS sync jobs
startIpfsSyncJobs(IPFS_GATEWAY, db, [
  { name: "Statements", iterationFn: runConceptspaceIpfsSyncIteration },
  { name: "Projects", iterationFn: runPubstarterIpfsSyncIteration },
]);

export default app;
