import { createHash } from "node:crypto";
import type { EventQuery, EventStore, RawEvent } from "../api/eventStore";
import { checkpointFromBlock, syncFromSnapshot } from "./memoryStore";
import type { Child, EventRow, Header, Snapshot } from "./types";
import type { ParkedSync } from "./spend";

/** Minimal query surface so tests do not import `pg`. */
export type Sql = {
  query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
};

export type SqlClient = Sql & { release(): void };

export type SqlPool = Sql & {
  connect(): Promise<SqlClient>;
  end(): Promise<void>;
};

const ident = /^[a-z][a-z0-9_]{0,62}$/;

export function quoteIdent(schema: string): string {
  if (!ident.test(schema)) throw new Error("Invalid prototype schema name");
  return schema;
}

function lockKey(schema: string): [number, number] {
  const hash = createHash("sha256").update(`raw-log:${schema}`).digest();
  return [hash.readInt32BE(0), hash.readInt32BE(4)];
}

/** Rows at or below the previous durable anchor are immutable; only the tail is rewritten. */
export function provisionalTail(previous: Snapshot | undefined, next: Snapshot): { anchor: bigint; inserted: EventRow[] } {
  if (previous && previous.chainId !== next.chainId) {
    throw new Error("Refusing to commit a snapshot whose chain changed");
  }
  if (previous && next.fromBlock > previous.fromBlock) {
    throw new Error("Refusing to commit a snapshot whose start block moved forward");
  }
  if (previous && next.durable.number < previous.durable.number) {
    throw new Error("Refusing to commit a regressed durable anchor");
  }
  const anchor = previous?.durable.number ?? next.fromBlock - 1n;
  const persisted = new Set(previous?.rows.map(row => row.id));
  return { anchor, inserted: next.rows.filter(row => BigInt(row.blockNumber) > anchor || !persisted.has(row.id)) };
}

export function schemaDdl(schema: string): string[] {
  const name = quoteIdent(schema);
  return [
    `CREATE SCHEMA IF NOT EXISTS ${name}`,
    `CREATE TABLE IF NOT EXISTS ${name}.sync_state (
      id boolean PRIMARY KEY DEFAULT true CHECK (id),
      chain_id integer NOT NULL,
      scope text NOT NULL,
      from_block numeric NOT NULL,
      head_number numeric NOT NULL,
      head_hash text NOT NULL,
      head_timestamp numeric NOT NULL,
      durable_number numeric NOT NULL,
      durable_hash text NOT NULL,
      durable_timestamp numeric NOT NULL,
      upstream_id text,
      coverage jsonb,
      backfill_committed boolean NOT NULL DEFAULT false
    )`,
    `CREATE TABLE IF NOT EXISTS ${name}.events (
      id text PRIMARY KEY,
      chain_id integer NOT NULL,
      contract_address text NOT NULL,
      event_name text NOT NULL,
      block_number numeric NOT NULL,
      block_timestamp numeric NOT NULL,
      transaction_hash text NOT NULL,
      log_index integer NOT NULL,
      topic0 text, topic1 text, topic2 text, topic3 text,
      data text NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS events_block_idx ON ${name}.events (chain_id, block_number, log_index)`,
    `CREATE INDEX IF NOT EXISTS events_topic1_idx ON ${name}.events (chain_id, topic1, block_number, log_index)`,
    `CREATE INDEX IF NOT EXISTS events_topic2_idx ON ${name}.events (chain_id, topic2, block_number, log_index)`,
    `CREATE INDEX IF NOT EXISTS events_topic3_idx ON ${name}.events (chain_id, topic3, block_number, log_index)`,
    `CREATE TABLE IF NOT EXISTS ${name}.children (
      name text NOT NULL,
      address text NOT NULL,
      start_block numeric NOT NULL,
      events jsonb NOT NULL,
      creation_hash text NOT NULL,
      PRIMARY KEY (name, address)
    )`,
  ];
}

/** Refuse a schema that already holds Ponder's tables. Creating our tables beside them is not a fresh schema. */
export async function assertFreshSchema(db: Sql, schema: string): Promise<void> {
  const name = quoteIdent(schema);
  const found = await db.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = $1 AND table_name IN ('_ponder_meta', '_ponder_checkpoint')`,
    [name],
  );
  if (found.rows.length) throw new Error("Refusing to open a schema that already has Ponder tables");
}

export async function ensureSchema(db: Sql, schema: string): Promise<void> {
  await assertFreshSchema(db, schema);
  for (const statement of schemaDdl(schema)) await db.query(statement);
  const name = quoteIdent(schema);
  await db.query(`ALTER TABLE ${name}.sync_state ADD COLUMN IF NOT EXISTS upstream_id text`);
  await db.query(`ALTER TABLE ${name}.sync_state ADD COLUMN IF NOT EXISTS coverage jsonb`);
  await db.query(`ALTER TABLE ${name}.sync_state ADD COLUMN IF NOT EXISTS backfill_committed boolean NOT NULL DEFAULT false`);
}

function headerParams(header: Header): [string, string, string] {
  return [header.number.toString(), header.hash, header.timestamp.toString()];
}

/** One transaction replaces the provisional tail, children, and watermarks together. */
export async function commitSnapshot(db: Sql, schema: string, previous: Snapshot | undefined, next: Snapshot): Promise<void> {
  const name = quoteIdent(schema);
  const { anchor, inserted } = provisionalTail(previous, next);
  await db.query("BEGIN");
  try {
    await db.query(`DELETE FROM ${name}.events WHERE block_number > $1`, [anchor.toString()]);
    for (const row of inserted) {
      await db.query(
        `INSERT INTO ${name}.events (
          id, chain_id, contract_address, event_name, block_number, block_timestamp,
          transaction_hash, log_index, topic0, topic1, topic2, topic3, data
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
`,
        [row.id, row.chainId, row.contractAddress, row.eventName, row.blockNumber, row.blockTimestamp,
          row.transactionHash, row.logIndex, row.topic0, row.topic1, row.topic2, row.topic3, row.data],
      );
    }
    await db.query(`DELETE FROM ${name}.children`);
    for (const child of next.children) {
      await db.query(
        `INSERT INTO ${name}.children (name, address, start_block, events, creation_hash) VALUES ($1,$2,$3,$4::jsonb,$5)`,
        [child.name, child.address, child.startBlock.toString(), JSON.stringify(child.events), child.creationHash],
      );
    }
    const [headNumber, headHash, headTimestamp] = headerParams(next.head);
    const [durableNumber, durableHash, durableTimestamp] = headerParams(next.durable);
    await db.query(
      `INSERT INTO ${name}.sync_state (
        id, chain_id, scope, from_block, head_number, head_hash, head_timestamp,
        durable_number, durable_hash, durable_timestamp, upstream_id, coverage, backfill_committed
      ) VALUES (true,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)
      ON CONFLICT (id) DO UPDATE SET
        chain_id = EXCLUDED.chain_id, scope = EXCLUDED.scope, from_block = EXCLUDED.from_block,
        head_number = EXCLUDED.head_number, head_hash = EXCLUDED.head_hash, head_timestamp = EXCLUDED.head_timestamp,
        durable_number = EXCLUDED.durable_number, durable_hash = EXCLUDED.durable_hash, durable_timestamp = EXCLUDED.durable_timestamp,
        upstream_id = EXCLUDED.upstream_id, coverage = EXCLUDED.coverage,
        backfill_committed = EXCLUDED.backfill_committed`,
      [next.chainId, next.scope, next.fromBlock.toString(), headNumber, headHash, headTimestamp, durableNumber, durableHash, durableTimestamp, next.upstreamId ?? null, next.coverage ? JSON.stringify(next.coverage, (_, value) => typeof value === "bigint" ? value.toString() : value) : null, next.backfillCommitted === true],
    );
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK").catch(() => undefined);
    throw error;
  }
}

function asHeader(number: unknown, hash: unknown, timestamp: unknown, label: string): Header {
  if (typeof hash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(hash)) throw new Error(`Invalid stored ${label} hash`);
  return { number: BigInt(String(number)), hash: hash as Header["hash"], timestamp: BigInt(String(timestamp)) };
}

export async function loadSnapshot(db: Sql, schema: string): Promise<Snapshot | undefined> {
  const name = quoteIdent(schema);
  const state = await db.query(`SELECT chain_id, scope, from_block::text, head_number::text, head_hash, head_timestamp::text, durable_number::text, durable_hash, durable_timestamp::text, upstream_id, coverage, backfill_committed FROM ${name}.sync_state`);
  const row = state.rows[0];
  if (!row) return undefined;
  const events = await db.query(`SELECT id, chain_id, contract_address, event_name, block_number::text, block_timestamp::text, transaction_hash, log_index, topic0, topic1, topic2, topic3, data FROM ${name}.events ORDER BY block_number, log_index`);
  const children = await db.query(`SELECT name, address, start_block::text, events, creation_hash FROM ${name}.children`);
  const snapshot: Snapshot = {
    version: 1,
    chainId: Number(row.chain_id),
    scope: String(row.scope),
    upstreamId: typeof row.upstream_id === "string" ? row.upstream_id : undefined,
    fromBlock: BigInt(String(row.from_block)),
    head: asHeader(row.head_number, row.head_hash, row.head_timestamp, "head"),
    durable: asHeader(row.durable_number, row.durable_hash, row.durable_timestamp, "durable"),
    rows: events.rows.map(event => ({
      id: String(event.id),
      chainId: Number(event.chain_id),
      contractAddress: String(event.contract_address) as EventRow["contractAddress"],
      eventName: String(event.event_name),
      blockNumber: String(event.block_number),
      blockTimestamp: String(event.block_timestamp),
      transactionHash: String(event.transaction_hash) as EventRow["transactionHash"],
      logIndex: Number(event.log_index),
      topic0: event.topic0 == null ? null : String(event.topic0),
      topic1: event.topic1 == null ? null : String(event.topic1),
      topic2: event.topic2 == null ? null : String(event.topic2),
      topic3: event.topic3 == null ? null : String(event.topic3),
      data: String(event.data),
    })),
    children: children.rows.map(child => ({
      name: String(child.name),
      address: String(child.address) as Child["address"],
      startBlock: BigInt(String(child.start_block)),
      events: child.events as Child["events"],
      creationHash: String(child.creation_hash) as Child["creationHash"],
    })),
    backfillCommitted: row.backfill_committed === true,
    coverage: Array.isArray(row.coverage) ? row.coverage.map(item => {
      const source = item as { address: string; startBlock: string; selectors: string[] };
      return { address: source.address as Child["address"], startBlock: BigInt(source.startBlock), selectors: source.selectors as Child["creationHash"][] };
    }) : undefined,
  };
  return snapshot;
}

function placeholders(start: number, values: unknown[]): string {
  return values.map((_, index) => `$${start + index}`).join(", ");
}

export function eventQuerySql(schema: string, query: EventQuery): { text: string; values: unknown[] } {
  const name = quoteIdent(schema);
  const where: string[] = [];
  const values: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    where.push(sql.replace("?", `$${values.length}`));
  };
  const equals: [string, unknown][] = [
    ["chain_id", query.chainId], ["contract_address", query.contractAddress], ["event_name", query.eventName],
    ["topic1", query.topic1], ["topic2", query.topic2], ["topic3", query.topic3],
  ];
  for (const [column, value] of equals) if (value != null) add(`${column} = ?`, value);
  const lists: [string, string[] | undefined][] = [
    ["event_name", query.eventNames], ["topic1", query.topic1In], ["topic2", query.topic2In], ["topic3", query.topic3In],
  ];
  for (const [column, list] of lists) {
    if (!list) continue;
    values.push(...list);
    where.push(`${column} IN (${placeholders(values.length - list.length + 1, list)})`);
  }
  if (query.blockNumberGte != null) add("block_number >= ?", query.blockNumberGte.toString());
  if (query.blockNumberLte != null) add("block_number <= ?", query.blockNumberLte.toString());
  if (query.after) {
    values.push(query.after.blockNumber.toString(), query.after.logIndex);
    where.push(`(block_number > $${values.length - 1} OR (block_number = $${values.length - 1} AND log_index > $${values.length}))`);
  }
  const order = query.order === "desc" ? "DESC" : "ASC";
  const limit = query.limit != null ? ` LIMIT ${Number(query.limit)}` : "";
  if (query.limit != null && (!Number.isSafeInteger(query.limit) || query.limit < 0)) throw new Error("Invalid event limit");
  const text = `SELECT id, chain_id, contract_address, event_name, block_number::text, block_timestamp::text, transaction_hash, log_index, topic0, topic1, topic2, topic3, data
    FROM ${name}.events ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY block_number ${order}, log_index ${order}${limit}`;
  return { text, values };
}

function rawEvent(row: Record<string, unknown>): RawEvent {
  return {
    id: String(row.id),
    chainId: Number(row.chain_id),
    contractAddress: String(row.contract_address),
    eventName: String(row.event_name),
    blockNumber: BigInt(String(row.block_number)),
    blockTimestamp: BigInt(String(row.block_timestamp)),
    transactionHash: String(row.transaction_hash),
    logIndex: Number(row.log_index),
    topic0: row.topic0 == null ? null : String(row.topic0),
    topic1: row.topic1 == null ? null : String(row.topic1),
    topic2: row.topic2 == null ? null : String(row.topic2),
    topic3: row.topic3 == null ? null : String(row.topic3),
    data: row.data == null ? null : String(row.data),
  };
}

export function postgresEventStore(db: Sql, schema: string, chainName: string, parked: () => ParkedSync = () => undefined): EventStore & { current(): Promise<Snapshot | undefined> } {
  return {
    current: () => loadSnapshot(db, schema),
    async query(query) {
      const sql = eventQuerySql(schema, query);
      const result = await db.query(sql.text, sql.values);
      const rows = result.rows.map(rawEvent);
      if (query.order === "desc") return rows.reverse();
      return rows;
    },
    async maxBlock(chainId) {
      const name = quoteIdent(schema);
      const values = chainId == null ? [] : [chainId];
      const where = chainId == null ? "" : "WHERE chain_id = $1";
      const result = await db.query(`SELECT max(block_number)::text AS max FROM ${name}.events ${where}`, values);
      const max = result.rows[0]?.max;
      return max == null ? null : BigInt(String(max));
    },
    async sync() {
      const snapshot = await loadSnapshot(db, schema);
      const status = syncFromSnapshot(snapshot, chainName);
      if (parked()) return { ...status, ready: false };
      if (status.chains[0]) {
        status.chains[0].indexedCheckpoint = checkpointFromBlock(BigInt(status.chains[0].indexedThrough));
      }
      return status;
    },
  };
}

type PgModule = { default?: { Pool: new (config: { connectionString: string; max?: number }) => SqlPool }; Pool: new (config: { connectionString: string; max?: number }) => SqlPool };

/** Session advisory lock: a second writer blocks in connect until this process releases it. */
export async function openPrototypeDatabase(connectionString: string, schema: string): Promise<{
  pool: SqlPool;
  lock: SqlClient;
  load(): Promise<Snapshot | undefined>;
  commit(previous: Snapshot | undefined, next: Snapshot): Promise<void>;
  close(): Promise<void>;
}> {
  const name = quoteIdent(schema);
  const imported = await import("pg") as PgModule;
  const pg = imported.Pool ? imported : imported.default!;
  const pool = new pg.Pool({ connectionString, max: 4 });
  await ensureSchema(pool, name);
  const lock = await pool.connect();
  const [a, b] = lockKey(name);
  await lock.query("SELECT pg_advisory_lock($1, $2)", [a, b]);
  return {
    pool,
    lock,
    load: () => loadSnapshot(pool, name),
    async commit(previous, next) {
      const client = await pool.connect();
      try { await commitSnapshot(client, name, previous, next); }
      finally { client.release(); }
    },
    async close() {
      await lock.query("SELECT pg_advisory_unlock($1, $2)", lockKey(name)).catch(() => undefined);
      lock.release();
      await pool.end();
    },
  };
}
