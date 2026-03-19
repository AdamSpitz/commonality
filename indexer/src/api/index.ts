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
import { and, eq, gte, lte } from "ponder";

// Import subsystem API factories
import { createConceptspaceApi } from "../conceptspace/api";
import { createPubstarterApi } from "../pubstarter/api";
import { createDelegationApi } from "../delegation/api";
import { createFundingportalApi } from "../fundingportal/api";

// Import background jobs
import { startIpfsSyncJobs } from "../utils/ipfsSyncJob.js";
import { runPubstarterIpfsSyncIteration } from "../pubstarter/utils/ipfsSyncJob";
import { runConceptspaceIpfsSyncIteration } from "../conceptspace/utils/ipfsSyncJob.js";
import { startSocialSyncJob } from "../utils/socialSyncJob.js";

const IPFS_GATEWAY = process.env.IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs";

/**
 * Recursively convert BigInt values to strings for JSON serialization.
 * Ponder's pglite returns bigint for numeric fields, which JSON.stringify can't handle.
 */
function serializeBigInts(obj: unknown): unknown {
  if (typeof obj === 'bigint') return String(obj);
  if (Array.isArray(obj)) return obj.map(serializeBigInts);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, serializeBigInts(v)])
    );
  }
  return obj;
}

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

// ============================================================================
// EVENTS CACHE REST API
// ============================================================================
// These endpoints serve raw event data and registry tables.
// Used by the SDK's eventCacheClient to fetch events for client-side folding.

app.get("/api/events", async (c) => {
  try {
    const contractAddress = c.req.query("contractAddress")?.toLowerCase();
    const eventName = c.req.query("eventName");
    const topic1 = c.req.query("topic1");
    const topic2 = c.req.query("topic2");
    const topic3 = c.req.query("topic3");
    const blockNumber_gte = c.req.query("blockNumber_gte");
    const blockNumber_lte = c.req.query("blockNumber_lte");
    const limit = Math.min(parseInt(c.req.query("limit") ?? "1000", 10) || 1000, 10000);

    const conditions: any[] = [];
    if (contractAddress) conditions.push(eq(schema.events.contractAddress, contractAddress as `0x${string}`));
    if (eventName) conditions.push(eq(schema.events.eventName, eventName));
    if (topic1) conditions.push(eq(schema.events.topic1, topic1));
    if (topic2) conditions.push(eq(schema.events.topic2, topic2));
    if (topic3) conditions.push(eq(schema.events.topic3, topic3));
    if (blockNumber_gte) conditions.push(gte(schema.events.blockNumber, BigInt(blockNumber_gte)));
    if (blockNumber_lte) conditions.push(lte(schema.events.blockNumber, BigInt(blockNumber_lte)));

    const query = db.select().from(schema.events);
    const items = await (conditions.length > 0
      ? query.where(and(...conditions))
      : query
    ).limit(limit);

    return c.json(serializeBigInts({ items }) as object);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/api/statements_registry", async (c) => {
  try {
    const limit = Math.min(parseInt(c.req.query("limit") ?? "100", 10) || 100, 10000);
    const offset = parseInt(c.req.query("offset") ?? "0", 10) || 0;
    const items = await db.select().from(schema.statementsRegistry).limit(limit).offset(offset);
    return c.json(serializeBigInts({ items }) as object);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/api/projects_registry", async (c) => {
  try {
    const limit = Math.min(parseInt(c.req.query("limit") ?? "100", 10) || 100, 10000);
    const offset = parseInt(c.req.query("offset") ?? "0", 10) || 0;
    const items = await db.select().from(schema.projectsRegistry).limit(limit).offset(offset);
    return c.json(serializeBigInts({ items }) as object);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/api/alignment_attestations_registry", async (c) => {
  try {
    const statementId = c.req.query("statementId");
    const attester = c.req.query("attester")?.toLowerCase();
    const subjectAddress = c.req.query("subjectAddress")?.toLowerCase();
    const limit = Math.min(parseInt(c.req.query("limit") ?? "100", 10) || 100, 10000);
    const offset = parseInt(c.req.query("offset") ?? "0", 10) || 0;

    const conditions: any[] = [];
    if (statementId) conditions.push(eq(schema.alignmentAttestationsRegistry.statementId, statementId));
    if (attester) conditions.push(eq(schema.alignmentAttestationsRegistry.attester, attester as `0x${string}`));
    if (subjectAddress) conditions.push(eq(schema.alignmentAttestationsRegistry.subjectAddress, subjectAddress as `0x${string}`));

    const query = db.select().from(schema.alignmentAttestationsRegistry);
    const items = await (conditions.length > 0
      ? query.where(and(...conditions))
      : query
    ).limit(limit).offset(offset);

    return c.json(serializeBigInts({ items }) as object);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/api/implications_registry", async (c) => {
  try {
    const fromStatementId = c.req.query("fromStatementId");
    const toStatementId = c.req.query("toStatementId");
    const attester = c.req.query("attester")?.toLowerCase();
    const limit = Math.min(parseInt(c.req.query("limit") ?? "100", 10) || 100, 10000);
    const offset = parseInt(c.req.query("offset") ?? "0", 10) || 0;

    const conditions: any[] = [];
    if (fromStatementId) conditions.push(eq(schema.implicationsRegistry.fromStatementId, fromStatementId));
    if (toStatementId) conditions.push(eq(schema.implicationsRegistry.toStatementId, toStatementId));
    if (attester) conditions.push(eq(schema.implicationsRegistry.attester, attester as `0x${string}`));

    const query = db.select().from(schema.implicationsRegistry);
    const items = await (conditions.length > 0
      ? query.where(and(...conditions))
      : query
    ).limit(limit).offset(offset);

    return c.json(serializeBigInts({ items }) as object);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Background IPFS sync jobs
startIpfsSyncJobs(IPFS_GATEWAY, db, [
  { name: "Statements", iterationFn: runConceptspaceIpfsSyncIteration },
  { name: "Projects", iterationFn: runPubstarterIpfsSyncIteration },
]);

// Background social data sync job (ENS names + Twitter follower counts)
startSocialSyncJob(db);

export default app;
