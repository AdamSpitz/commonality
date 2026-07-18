/**
 * Main API Router
 *
 * Serves:
 *   - SQL client for direct queries
 *   - GraphQL endpoint (auto-generated from schema)
 *   - REST endpoint for the events cache
 */

import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { client, graphql } from "ponder";
import { and, eq, gte, lte } from "ponder";
import { decodeEventLog, getAddress, isAddress, type Hex } from "viem";
import { PublishedDataAbi } from "../../abis/PublishedDataAbi";

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

function padAddressAsTopic(address: string): string {
  return `0x${getAddress(address).slice(2).toLowerCase().padStart(64, "0")}`;
}

function normalizeDataId(dataId: string): Hex | null {
  return /^0x[0-9a-fA-F]{64}$/.test(dataId) ? (dataId.toLowerCase() as Hex) : null;
}

function orderRawEvents(a: { blockNumber: bigint; logIndex: number }, b: { blockNumber: bigint; logIndex: number }): number {
  const blockDelta = a.blockNumber - b.blockNumber;
  if (blockDelta !== 0n) return blockDelta < 0n ? -1 : 1;
  return a.logIndex - b.logIndex;
}

function decodePublishedDataContent(event: { data: string | null; topic0: string | null; topic1: string | null; topic2: string | null }): Hex | null {
  if (!event.data || !event.topic0 || !event.topic1 || !event.topic2) return null;
  try {
    const decoded = decodeEventLog({
      abi: PublishedDataAbi,
      eventName: "DataPublished",
      data: event.data as Hex,
      topics: [event.topic0 as Hex, event.topic1 as Hex, event.topic2 as Hex],
    }) as { args: { content: Hex } };
    return decoded.args.content;
  } catch {
    return null;
  }
}

const app = new Hono();

// Expose SQL client for direct queries (all tables)
app.use("/sql/*", client({ db, schema }));

// Root GraphQL API (auto-generated from schema - all tables)
app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

// ============================================================================
// EVENTS CACHE REST API
// ============================================================================
// This endpoint serves raw event data for SDK client-side folding.

app.get("/api/published-data/:publisher/:dataId", async (c) => {
  try {
    const publisherParam = c.req.param("publisher");
    const dataIdParam = c.req.param("dataId");
    if (!isAddress(publisherParam)) {
      return c.json({ error: "Invalid publisher address" }, 400);
    }
    const dataId = normalizeDataId(dataIdParam);
    if (!dataId) {
      return c.json({ error: "Invalid dataId; expected bytes32 hex" }, 400);
    }

    const chainId = Number(c.req.query("chainId") ?? 0) || undefined;
    const contractAddress = c.req.query("contractAddress")?.toLowerCase();
    const publisherTopic = padAddressAsTopic(publisherParam);

    const baseConditions = [];
    if (chainId) baseConditions.push(eq(schema.events.chainId, chainId));
    if (contractAddress) baseConditions.push(eq(schema.events.contractAddress, contractAddress as `0x${string}`));

    const publicationConditions = [
      ...baseConditions,
      eq(schema.events.eventName, "DataPublished"),
      eq(schema.events.topic1, publisherTopic),
      eq(schema.events.topic2, dataId),
    ];
    const retractionConditions = [
      ...baseConditions,
      eq(schema.events.eventName, "DataRetracted"),
      eq(schema.events.topic1, publisherTopic),
      eq(schema.events.topic2, dataId),
    ];

    const publications = await db.select().from(schema.events).where(and(...publicationConditions)).limit(1000);
    const retractions = await db.select().from(schema.events).where(and(...retractionConditions)).limit(1000);
    const latestPublication = publications.sort(orderRawEvents).at(-1);
    const isRetracted = retractions.length > 0;

    if (!latestPublication) {
      return c.json({ status: "not-published", publisher: getAddress(publisherParam), dataId });
    }

    const content = decodePublishedDataContent(latestPublication);
    if (!content) {
      return c.json({ error: "PublishedData event content could not be decoded" }, 502);
    }

    return c.json(serializeBigInts({
      status: isRetracted ? "retracted" : "active",
      publisher: getAddress(publisherParam),
      dataId,
      [isRetracted ? "retractedData" : "data"]: content,
      publication: {
        blockNumber: latestPublication.blockNumber,
        transactionHash: latestPublication.transactionHash,
        logIndex: latestPublication.logIndex,
      },
    }) as object);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/api/events", async (c) => {
  try {
    const chainId = c.req.query("chainId");
    const contractAddress = c.req.query("contractAddress")?.toLowerCase();
    const eventName = c.req.query("eventName");
    const topic1 = c.req.query("topic1");
    const topic2 = c.req.query("topic2");
    const topic3 = c.req.query("topic3");
    const blockNumber_gte = c.req.query("blockNumber_gte");
    const blockNumber_lte = c.req.query("blockNumber_lte");
    const limit = Math.min(parseInt(c.req.query("limit") ?? "1000", 10) || 1000, 10000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = [];
    if (chainId) conditions.push(eq(schema.events.chainId, Number(chainId)));
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

export default app;
