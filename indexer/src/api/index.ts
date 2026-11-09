/**
 * Main API Router
 *
 * Serves:
 *   - SQL client for direct queries
 *   - GraphQL endpoint (auto-generated from schema)
 *   - REST endpoint for the events cache
 *
 * REST handlers live in restApp.ts so the raw-log prototype can serve the same routes.
 */

import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { client, graphql } from "ponder";
import { attachRest } from "./restApp";
import { ponderEventStore } from "./ponderEventStore";

const app = new Hono();

attachRest(app, ponderEventStore());

app.use("/sql/*", client({ db, schema }));
app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

export default app;
