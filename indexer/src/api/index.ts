/**
 * Main API Router
 *
 * This module composes the APIs from all logical indexer subsystems.
 * Each subsystem has its own API module that is mounted here.
 *
 * Subsystems:
 * - Concept Space: /conceptspace/* - Statements, beliefs, implications
 * - Pubstarter: /pubstarter/* - Crowdfunding projects, contributions, markets
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

export default app;
