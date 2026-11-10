/**
 * REST routes shared by the Ponder process and the raw-log prototype.
 * Response shapes match indexer/README.md. GraphQL and /sql stay on Ponder.
 */

import { Hono } from "hono";
import { getAddress, isAddress, type Hex } from "viem";
import { fundingIndexerRoutesEnabled } from "../indexing/contractCapabilities";
import { noteIndexerWake, requestWakesIndexer } from "../rpc/idleHeadCache";
import {
  EventCursorError,
  assertCursorMatchesRequest,
  decodeEventFeedCursor,
  encodeEventFeedCursor,
  eventFeedScope,
} from "./eventCursor";
import type { EventQuery, EventStore, RawEvent } from "./eventStore";
import {
  encodeSegmentTuples,
  eventSegmentBlocks,
  eventSegmentConfirmations,
  immutableSegmentRanges,
  maybeGzip,
  segmentResponseHeaders,
  segmentSha256,
} from "./eventSegments";
import { isBareContractLogQuery, projectReadDemandReport, recordUnindexedProjectLogRequest } from "./projectReadDemand";
import { followCheckpointFromSync } from "./syncWatermark";

const TOPIC_IN_LIMIT = 32;
const PROJECT_CREATION_EVENTS = ["LazyGivingAssuranceContractCreated", "CreatorContractCreated", "FixedControllerAssuranceCreated"];

class TopicInError extends Error {}

/** Immutable segments stop at the committed durable watermark, not the newest event. */
async function durableSegmentThrough(store: EventStore, chainId: number): Promise<bigint> {
  const sync = await store.sync();
  if (!sync.ready) return -1n;
  const chain = sync.chains.find(row => row.chainId === String(chainId));
  if (!chain || !/^\d+$/.test(chain.finalizedThrough)) return -1n;
  return BigInt(chain.finalizedThrough);
}

function serializeBigInts(obj: unknown): unknown {
  if (typeof obj === "bigint") return String(obj);
  if (Array.isArray(obj)) return obj.map(serializeBigInts);
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, serializeBigInts(v)]),
    );
  }
  return obj;
}

function parseTopicIn(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const topics = value.split(",").map(part => part.trim()).filter(Boolean);
  if (topics.length > TOPIC_IN_LIMIT) {
    throw new TopicInError(`topic_in accepts at most ${TOPIC_IN_LIMIT} values`);
  }
  return topics.length > 0 ? topics : undefined;
}

function padAddressAsTopic(address: string): string {
  return `0x${getAddress(address).slice(2).toLowerCase().padStart(64, "0")}`;
}

function addressFromPaddedTopic(topic: string): string {
  return getAddress(`0x${topic.slice(-40)}`);
}

function parseHonoredRetractorTopics(value: string | undefined): Set<string> {
  if (!value) return new Set();
  return new Set(
    value.split(",").map(entry => entry.trim()).filter(entry => entry.length > 0 && isAddress(entry)).map(padAddressAsTopic),
  );
}

function normalizeDataId(dataId: string): Hex | null {
  return /^0x[0-9a-fA-F]{64}$/.test(dataId) ? (dataId.toLowerCase() as Hex) : null;
}

function orderRawEvents(a: RawEvent, b: RawEvent): number {
  const blockDelta = a.blockNumber - b.blockNumber;
  if (blockDelta !== 0n) return blockDelta < 0n ? -1 : 1;
  return a.logIndex - b.logIndex;
}

function publicationPointer(event: RawEvent) {
  return {
    blockNumber: event.blockNumber,
    transactionHash: event.transactionHash,
    logIndex: event.logIndex,
  };
}

function chainFilter(chainId: number | undefined, contractAddress: string | undefined): Pick<EventQuery, "chainId" | "contractAddress"> {
  return {
    chainId,
    contractAddress,
  };
}

export function attachRest(app: Hono, store: EventStore): void {
  app.use("*", async (c, next) => {
    if (requestWakesIndexer(c.req.method, c.req.path)) noteIndexerWake();
    await next();
  });

  app.post("/api/indexer-wake", (c) => {
    const until = noteIndexerWake();
    return c.json({
      ok: true,
      fastPollingUntil: until > 0 ? new Date(until).toISOString() : null,
    });
  });

  app.get("/api/published-data/:dataId", async (c) => {
    try {
      const dataId = normalizeDataId(c.req.param("dataId"));
      if (!dataId) return c.json({ error: "Invalid dataId; expected bytes32 hex" }, 400);
      const chainId = Number(c.req.query("chainId") ?? 0) || undefined;
      const contractAddress = c.req.query("contractAddress")?.toLowerCase();
      const honoredRetractorTopics = parseHonoredRetractorTopics(c.req.query("honoredRetractors"));
      const base = chainFilter(chainId, contractAddress);
      const publications = await store.query({ ...base, eventName: "DataPublished", topic2: dataId, order: "asc", limit: 1000 });
      const retractions = await store.query({ ...base, eventName: "DataRetracted", topic2: dataId, order: "asc", limit: 1000 });
      return c.json(serializeBigInts(publishedDataView(dataId, publications, retractions, honoredRetractorTopics)) as object);
    } catch (error) {
      return c.json({ error: String(error) }, 500);
    }
  });

  app.get("/api/published-data/:publisher/:dataId", async (c) => {
    try {
      const publisherParam = c.req.param("publisher");
      const dataId = normalizeDataId(c.req.param("dataId"));
      if (!isAddress(publisherParam)) return c.json({ error: "Invalid publisher address" }, 400);
      if (!dataId) return c.json({ error: "Invalid dataId; expected bytes32 hex" }, 400);
      const chainId = Number(c.req.query("chainId") ?? 0) || undefined;
      const contractAddress = c.req.query("contractAddress")?.toLowerCase();
      const publisherTopic = padAddressAsTopic(publisherParam);
      const base = { ...chainFilter(chainId, contractAddress), topic1: publisherTopic, topic2: dataId, order: "asc" as const, limit: 1000 };
      const publications = await store.query({ ...base, eventName: "DataPublished" });
      const retractions = await store.query({ ...base, eventName: "DataRetracted" });
      const latestPublication = publications.sort(orderRawEvents).at(-1);
      if (!latestPublication) {
        return c.json({ status: "not-published", publisher: getAddress(publisherParam), dataId });
      }
      return c.json(serializeBigInts({
        status: retractions.length > 0 ? "retracted" : "active",
        publisher: getAddress(publisherParam),
        dataId,
        publication: publicationPointer(latestPublication),
      }) as object);
    } catch (error) {
      return c.json({ error: String(error) }, 500);
    }
  });

  app.get("/api/sync", async (c) => {
    try {
      const chainId = c.req.query("chainId");
      const sync = await store.sync();
      const chains = chainId ? sync.chains.filter(row => row.chainId === chainId) : sync.chains;
      return c.json({ ready: sync.ready, upstreamId: sync.upstreamId, chains });
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
      const topicLists = {
        topic1: parseTopicIn(c.req.query("topic1_in")),
        topic2: parseTopicIn(c.req.query("topic2_in")),
        topic3: parseTopicIn(c.req.query("topic3_in")),
      };
      const blockNumberGte = c.req.query("blockNumber_gte");
      const blockNumberLte = c.req.query("blockNumber_lte");
      const limit = Math.min(parseInt(c.req.query("limit") ?? "1000", 10) || 1000, 10000);
      const follow = c.req.query("follow") === "1";
      const filters: EventQuery = {
        chainId: chainId ? Number(chainId) : undefined,
        contractAddress,
        eventName,
        topic1,
        topic2,
        topic3,
        topic1In: topicLists.topic1,
        topic2In: topicLists.topic2,
        topic3In: topicLists.topic3,
        blockNumberGte: blockNumberGte ? BigInt(blockNumberGte) : undefined,
        order: follow ? "asc" : "desc",
        limit,
      };

      if (follow) {
        const page = await followPage(c, store, filters, chainId, blockNumberLte);
        return c.json(serializeBigInts(page) as object);
      }

      if (blockNumberLte) filters.blockNumberLte = BigInt(blockNumberLte);
      const items = await store.query(filters);
      if (
        fundingIndexerRoutesEnabled()
        && items.length === 0
        && isBareContractLogQuery({
          contractAddress,
          eventName,
          topic1,
          topic2,
          topic3,
          blockNumber_gte: blockNumberGte,
          blockNumber_lte: blockNumberLte,
        })
      ) {
        recordUnindexedProjectLogRequest(contractAddress!);
      }
      return c.json(serializeBigInts({ items, truncated: items.length === limit }) as object);
    } catch (error) {
      if (error instanceof TopicInError || error instanceof EventCursorError) {
        return c.json({ error: error.message }, 400);
      }
      return c.json({ error: String(error) }, 500);
    }
  });

  app.get("/api/event-segments/manifest", async (c) => {
    try {
      const chainId = Number(c.req.query("chainId"));
      const eventName = c.req.query("eventName");
      if (!Number.isInteger(chainId) || !eventName) {
        return c.json({ error: "chainId and eventName are required" }, 400);
      }
      const segmentSize = eventSegmentBlocks();
      const confirmations = eventSegmentConfirmations();
      const head = await store.maxBlock(chainId);
      const finalizedThrough = await durableSegmentThrough(store, chainId);
      const segments = [];
      for (const range of immutableSegmentRanges(finalizedThrough, segmentSize)) {
        const rows = await store.query({
          chainId,
          eventName,
          blockNumberGte: range.fromBlock,
          blockNumberLte: range.toBlock,
          order: "asc",
        });
        if (rows.length === 0) continue;
        const body = encodeSegmentTuples(rows);
        segments.push({
          fromBlock: range.fromBlock.toString(),
          toBlock: range.toBlock.toString(),
          count: rows.length,
          sha256: segmentSha256(body),
        });
      }
      return c.json({
        segmentSize: segmentSize.toString(),
        confirmations: confirmations.toString(),
        indexedHead: head == null ? null : head.toString(),
        finalizedThrough: finalizedThrough.toString(),
        segments,
      }, 200, { "cache-control": "public, max-age=30" });
    } catch (error) {
      return c.json({ error: String(error) }, 500);
    }
  });

  app.get("/api/event-segments/:chainId/:eventName/:fromBlock", async (c) => {
    try {
      const chainId = Number(c.req.param("chainId"));
      const eventName = c.req.param("eventName");
      const fromBlock = BigInt(c.req.param("fromBlock"));
      const segmentSize = eventSegmentBlocks();
      if (!Number.isInteger(chainId) || fromBlock < 0n || fromBlock % segmentSize !== 0n) {
        return c.json({ error: "segment is not a finalized aligned range" }, 400);
      }
      const toBlock = fromBlock + segmentSize - 1n;
      const finalizedThrough = await durableSegmentThrough(store, chainId);
      if (toBlock > finalizedThrough) return c.json({ error: "segment is not finalized" }, 404);
      const rows = await store.query({
        chainId,
        eventName,
        blockNumberGte: fromBlock,
        blockNumberLte: toBlock,
        order: "asc",
      });
      if (rows.length === 0) return c.json({ error: "empty segment" }, 404);
      const body = encodeSegmentTuples(rows);
      const packed = maybeGzip(body, c.req.header("accept-encoding"));
      const headers = segmentResponseHeaders(segmentSha256(body), true);
      if (packed.encoding) headers["content-encoding"] = packed.encoding;
      const bytes = packed.payload.buffer.slice(
        packed.payload.byteOffset,
        packed.payload.byteOffset + packed.payload.byteLength,
      ) as ArrayBuffer;
      return c.body(bytes, 200, headers);
    } catch (error) {
      return c.json({ error: String(error) }, 500);
    }
  });

  app.get("/api/project-read-demand", async (c) => {
    if (!fundingIndexerRoutesEnabled()) {
      return c.json({ error: "project read demand is a funding indexer route" }, 404);
    }
    try {
      const windowMs = Math.min(parseInt(c.req.query("windowMs") ?? String(24 * 60 * 60 * 1000), 10) || 0, 24 * 60 * 60 * 1000);
      const now = Date.now();
      const preliminary = projectReadDemandReport(new Map(), now, windowMs);
      const factoryByProject = new Map<string, string>();
      await Promise.all(preliminary.projects.map(async (project) => {
        const created = await store.query({
          topic1: padAddressAsTopic(project.address),
          eventNames: [...PROJECT_CREATION_EVENTS],
          order: "asc",
          limit: 1,
        });
        const factoryEvent = created[0];
        if (factoryEvent) factoryByProject.set(project.address, factoryEvent.contractAddress.toLowerCase());
      }));
      return c.json(projectReadDemandReport(factoryByProject, now, windowMs));
    } catch (error) {
      return c.json({ error: String(error) }, 500);
    }
  });
}

function publishedDataView(
  dataId: Hex,
  publications: RawEvent[],
  retractions: RawEvent[],
  honoredRetractorTopics: Set<string>,
) {
  const retractedPublishers = new Set(retractions.map(event => event.topic1).filter((topic): topic is string => Boolean(topic)));
  const latestPublicationByPublisher = new Map<string, RawEvent>();
  for (const publication of publications.sort(orderRawEvents)) {
    if (publication.topic1) latestPublicationByPublisher.set(publication.topic1, publication);
  }
  const hasHonoredPolicyRetraction = [...honoredRetractorTopics].some(topic => retractedPublishers.has(topic));
  const livePublications = hasHonoredPolicyRetraction
    ? []
    : [...latestPublicationByPublisher.entries()]
      .filter(([publisherTopic]) => !retractedPublishers.has(publisherTopic))
      .map(([, publication]) => publication);
  if (livePublications.length > 0) {
    return {
      status: "active",
      dataId,
      livePublishers: livePublications.map(publication => publication.topic1).filter((topic): topic is string => Boolean(topic)).map(addressFromPaddedTopic),
      publications: livePublications.sort(orderRawEvents).map(publication => ({
        publisher: addressFromPaddedTopic(publication.topic1!),
        ...publicationPointer(publication),
      })),
    };
  }
  const retractedPublications = [...latestPublicationByPublisher.values()].sort(orderRawEvents);
  if (retractedPublications.length === 0) return { status: "not-published", dataId };
  return {
    status: "retracted",
    dataId,
    retractedPublishers: [...retractedPublishers].map(addressFromPaddedTopic),
    publications: retractedPublications.map(publication => ({
      publisher: addressFromPaddedTopic(publication.topic1!),
      ...publicationPointer(publication),
    })),
  };
}

async function followPage(
  c: { req: { query: (name: string) => string | undefined } },
  store: EventStore,
  filters: EventQuery,
  chainId: string | undefined,
  blockNumberLte: string | undefined,
) {
  if (!chainId) throw new EventCursorError("follow=1 requires chainId");
  const scope = eventFeedScope({
    chainId,
    contractAddress: filters.contractAddress,
    eventName: filters.eventName,
    topic1: filters.topic1,
    topic2: filters.topic2,
    topic3: filters.topic3,
    topic1_in: c.req.query("topic1_in"),
    topic2_in: c.req.query("topic2_in"),
    topic3_in: c.req.query("topic3_in"),
    blockNumber_gte: c.req.query("blockNumber_gte"),
  });
  const afterParam = c.req.query("after");
  const after = afterParam ? decodeEventFeedCursor(afterParam) : null;
  let checkpoint = c.req.query("checkpoint") ?? after?.checkpoint;
  if (after && checkpoint) assertCursorMatchesRequest(after, scope, checkpoint);
  if (!checkpoint) {
    const sync = await store.sync();
    checkpoint = followCheckpointFromSync(sync.chains, chainId, sync.ready);
  }
  if (!checkpoint) {
    const head = await store.maxBlock(Number(chainId));
    checkpoint = head == null ? undefined : head.toString();
  }
  if (!checkpoint) {
    return { items: [], truncated: false, nextCursor: null, checkpoint: null, completeThroughCheckpoint: false };
  }
  if (blockNumberLte && BigInt(blockNumberLte) < BigInt(checkpoint)) checkpoint = blockNumberLte;
  if (after) assertCursorMatchesRequest(after, scope, checkpoint);
  filters.blockNumberLte = BigInt(checkpoint);
  if (after) filters.after = { blockNumber: BigInt(after.blockNumber), logIndex: after.logIndex };
  const items = await store.query(filters);
  const truncated = items.length === filters.limit;
  const last = items[items.length - 1];
  const nextCursor = truncated && last
    ? encodeEventFeedCursor({
      blockNumber: last.blockNumber.toString(),
      logIndex: last.logIndex,
      checkpoint,
      scope,
    })
    : null;
  return { items, truncated, nextCursor, checkpoint, completeThroughCheckpoint: !truncated };
}
