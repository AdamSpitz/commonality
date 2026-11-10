import { db } from "ponder:api";
import schema from "ponder:schema";
import { and, asc, desc, eq, gt, gte, lte, max, or } from "ponder";
import type { EventQuery, EventStore, RawEvent, SyncStatus } from "./eventStore";
import { chainSyncWatermarks, upstreamIdFromAppMeta, type CheckpointRow } from "./syncWatermark";

type PonderDatabase = {
  readonlyQB?: {
    wrap: (label: { label: string }, fn: (db: { execute: (query: string) => Promise<{ rows: unknown[] }> }) => Promise<{ rows: unknown[] }>) => Promise<{ rows: unknown[] }>;
  };
};

function mapRow(row: {
  id: string;
  chainId: number;
  contractAddress: string;
  eventName: string;
  blockNumber: bigint | number | string;
  blockTimestamp: bigint | number | string;
  transactionHash: string;
  logIndex: number;
  topic0: string | null;
  topic1: string | null;
  topic2: string | null;
  topic3: string | null;
  data: string | null;
}): RawEvent {
  return {
    ...row,
    blockNumber: BigInt(row.blockNumber),
    blockTimestamp: BigInt(row.blockTimestamp),
  };
}

function conditionsFor(query: EventQuery) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: any[] = [];
  if (query.chainId != null) conditions.push(eq(schema.events.chainId, query.chainId));
  if (query.contractAddress) conditions.push(eq(schema.events.contractAddress, query.contractAddress as `0x${string}`));
  if (query.eventName) conditions.push(eq(schema.events.eventName, query.eventName));
  if (query.eventNames && query.eventNames.length > 0) {
    const match = or(...query.eventNames.map(name => eq(schema.events.eventName, name)));
    if (match) conditions.push(match);
  }
  if (query.topic1) conditions.push(eq(schema.events.topic1, query.topic1));
  if (query.topic2) conditions.push(eq(schema.events.topic2, query.topic2));
  if (query.topic3) conditions.push(eq(schema.events.topic3, query.topic3));
  for (const [column, topics] of [
    [schema.events.topic1, query.topic1In],
    [schema.events.topic2, query.topic2In],
    [schema.events.topic3, query.topic3In],
  ] as const) {
    if (!topics || topics.length === 0) continue;
    const match = or(...topics.map(topic => eq(column, topic)));
    if (match) conditions.push(match);
  }
  if (query.blockNumberGte != null) conditions.push(gte(schema.events.blockNumber, query.blockNumberGte));
  if (query.blockNumberLte != null) conditions.push(lte(schema.events.blockNumber, query.blockNumberLte));
  if (query.after) {
    conditions.push(or(
      gt(schema.events.blockNumber, query.after.blockNumber),
      and(eq(schema.events.blockNumber, query.after.blockNumber), gt(schema.events.logIndex, query.after.logIndex)),
    ));
  }
  return conditions;
}

const PONDER_CHECKPOINT_LENGTH = 75;
const PONDER_BLOCK_OFFSET = 26;
const PONDER_BLOCK_DIGITS = 16;

/** Read Ponder's internal `_ponder_checkpoint` row. Public cursors are 16-digit block strings. */
function blockFromInternalCheckpoint(checkpoint: string): bigint {
  if (!/^\d+$/.test(checkpoint) || checkpoint.length !== PONDER_CHECKPOINT_LENGTH) {
    throw new Error("Ponder checkpoint is invalid");
  }
  return BigInt(checkpoint.slice(PONDER_BLOCK_OFFSET, PONDER_BLOCK_OFFSET + PONDER_BLOCK_DIGITS));
}

async function readChainSync(): Promise<SyncStatus> {
  const database = (globalThis as { PONDER_DATABASE?: PonderDatabase }).PONDER_DATABASE;
  const qb = database?.readonlyQB;
  if (!qb) return { ready: false, upstreamId: "", chains: [] };
  const [meta, checkpoints] = await Promise.all([
    qb.wrap({ label: "select_sync_ready" }, (inner) => inner.execute(
      "SELECT value FROM _ponder_meta WHERE key = 'app'",
    )),
    qb.wrap({ label: "select_sync_checkpoints" }, (inner) => inner.execute(
      "SELECT chain_id, chain_name, latest_checkpoint, finalized_checkpoint FROM _ponder_checkpoint",
    )),
  ]);
  const app = meta.rows[0] as { value?: { is_ready?: number; build_id?: unknown } } | undefined;
  return {
    ready: app?.value?.is_ready === 1,
    upstreamId: upstreamIdFromAppMeta(app?.value),
    chains: chainSyncWatermarks((checkpoints.rows as Array<{
      chain_id: string | number | bigint;
      chain_name: string;
      latest_checkpoint: string;
      finalized_checkpoint: string;
    }>).map(row => ({
      chain_id: row.chain_id,
      chain_name: row.chain_name,
      indexedThrough: blockFromInternalCheckpoint(row.latest_checkpoint),
      finalizedThrough: blockFromInternalCheckpoint(row.finalized_checkpoint),
    }) satisfies CheckpointRow)),
  };
}

export function ponderEventStore(): EventStore {
  return {
    async query(query) {
      const conditions = conditionsFor(query);
      const base = db.select().from(schema.events);
      const filtered = conditions.length > 0 ? base.where(and(...conditions)) : base;
      if (query.order === "desc") {
        const limited = query.limit != null
          ? filtered.orderBy(desc(schema.events.blockNumber), desc(schema.events.logIndex)).limit(query.limit)
          : filtered.orderBy(desc(schema.events.blockNumber), desc(schema.events.logIndex));
        return (await limited).reverse().map(mapRow);
      }
      const ordered = filtered.orderBy(asc(schema.events.blockNumber), asc(schema.events.logIndex));
      const rows = query.limit != null ? await ordered.limit(query.limit) : await ordered;
      return rows.map(mapRow);
    },
    async maxBlock(chainId) {
      const headQuery = db.select({ head: max(schema.events.blockNumber) }).from(schema.events);
      const [headRow] = chainId == null
        ? await headQuery
        : await headQuery.where(eq(schema.events.chainId, chainId));
      return headRow?.head == null ? null : BigInt(headRow.head);
    },
    sync: readChainSync,
  };
}
