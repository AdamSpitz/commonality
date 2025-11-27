/**
 * Pubstarter Indexer API
 *
 * This module provides the GraphQL API for the Pubstarter subsystem.
 * It is logically separate from the Concept Space API.
 *
 * The GraphQL API is auto-generated from the schema tables:
 * - projects (pubstarter_projects)
 * - projectTokens (pubstarter_project_tokens)
 * - contributions (pubstarter_contributions)
 * - refunds (pubstarter_refunds)
 * - saleListings (pubstarter_sale_listings)
 * - buyOrders (pubstarter_buy_orders)
 * - trades (pubstarter_trades)
 * - participantSummaries (pubstarter_participant_summaries)
 *
 * All queries support filtering, sorting, and pagination through the
 * auto-generated GraphQL schema.
 */

import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { graphql } from "ponder";

const app = new Hono();

// GraphQL API for pubstarter data (auto-generated from schema)
app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

export default app;
