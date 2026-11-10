import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { test } from "node:test";
import { commitSnapshot, loadSnapshot, openPrototypeDatabase, type SqlPool } from "./postgres";
import type { EventRow, Snapshot } from "./types";

const url = process.env.INDEXER_PROTOTYPE_TEST_DATABASE_URL;
const hash = (byte: string) => `0x${byte.repeat(32)}` as const;
const schema = `raw_log_live_${process.pid}`;

function row(id: string, block: string): EventRow {
  return {
    id, chainId: 84532, contractAddress: "0x0000000000000000000000000000000000000001",
    eventName: "E", blockNumber: block, blockTimestamp: "1", transactionHash: hash("ab"),
    logIndex: 0, topic0: null, topic1: null, topic2: null, topic3: null, data: "0x",
  };
}

function snap(rows: EventRow[], durable: bigint, head: bigint, children: Snapshot["children"] = []): Snapshot {
  return {
    version: 1, chainId: 84532, scope: "c".repeat(64), upstreamId: "epoch-1", fromBlock: 1n,
    head: { number: head, hash: hash("11"), timestamp: head },
    durable: { number: durable, hash: hash("22"), timestamp: durable },
    rows, children,
    coverage: [{ address: "0x0000000000000000000000000000000000000001", startBlock: 1n, selectors: [hash("33")] }],
  };
}

function crashSession(connectionString: string, name: string, txHash: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--input-type=module", "-e", `
      import pg from 'pg';
      const client = new pg.Client({ connectionString: process.env.URL });
      await client.connect();
      await client.query('BEGIN');
      await client.query('DELETE FROM ${name}.events');
      await client.query("INSERT INTO ${name}.events (id, chain_id, contract_address, event_name, block_number, block_timestamp, transaction_hash, log_index, data) VALUES ('orphan', 84532, '0x0000000000000000000000000000000000000001', 'E', 1, 1, $1, 0, '0x')", [process.env.HASH]);
      process.stdout.write('armed');
      await new Promise(() => undefined);
    `], { env: { ...process.env, URL: connectionString, HASH: txHash }, cwd: process.cwd() });
    let armed = false;
    child.stdout.on("data", (chunk: Buffer) => {
      if (!armed && chunk.toString().includes("armed")) {
        armed = true;
        child.kill("SIGKILL");
      }
    });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on("exit", () => armed ? resolve() : reject(new Error(`crash child exited before arming: ${stderr}`)));
    child.on("error", reject);
  });
}

async function pool(connectionString: string): Promise<SqlPool & { on(event: string, listener: () => void): void }> {
  const imported = await import("pg") as { Pool?: new (config: { connectionString: string }) => SqlPool & { on(event: string, listener: () => void): void }; default?: { Pool: new (config: { connectionString: string }) => SqlPool & { on(event: string, listener: () => void): void } } };
  const Pool = imported.Pool ?? imported.default!.Pool;
  const created = new Pool({ connectionString });
  created.on("error", () => undefined);
  return created;
}

test("live postgres keeps durable rows across a killed write and a provisional reorg", { skip: url ? false : "set INDEXER_PROTOTYPE_TEST_DATABASE_URL" }, async () => {
  const side = await pool(url!);
  await side.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  const db = await openPrototypeDatabase(url!, schema);
  try {
    const kept = row("durable", "9");
    const provisional = row("tip", "11");
    const child = {
      name: "Child", address: "0x0000000000000000000000000000000000000002" as const,
      startBlock: 11n, events: [], creationHash: hash("44"),
    };
    const first = snap([kept, provisional], 10n, 12n, [child]);
    await db.commit(undefined, first);
    const loaded = await db.load();
    assert.equal(loaded?.rows.length, 2);
    assert.equal(loaded?.children.length, 1);
    assert.equal(loaded?.upstreamId, "epoch-1");
    assert.equal(loaded?.coverage?.[0]?.startBlock, 1n);

    await crashSession(url!, schema, hash("ab"));
    const afterKill = await loadSnapshot(db.pool, schema);
    assert.deepEqual(afterKill?.rows.map(item => item.id).sort(), ["durable", "tip"]);

    const reorg = snap([kept], 10n, 13n, []);
    reorg.head.hash = hash("55");
    await db.commit(first, reorg);
    const afterReorg = await db.load();
    assert.deepEqual(afterReorg?.rows.map(item => item.id), ["durable"]);
    assert.equal(afterReorg?.children.length, 0);
    assert.equal(afterReorg?.head.hash, hash("55"));

    const regressed = snap([kept], 9n, 13n);
    await assert.rejects(() => commitSnapshot(db.pool, schema, afterReorg, regressed), /regressed durable/);
    assert.equal((await db.load())?.durable.number, 10n);

    let blocked = true;
    const second = openPrototypeDatabase(url!, schema).then(opened => { blocked = false; return opened; });
    await new Promise(resolve => setTimeout(resolve, 400));
    assert.equal(blocked, true);
    await db.close();
    const opened = await second;
    await opened.close();
  } finally {
    await db.close().catch(() => undefined);
    await side.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`).catch(() => undefined);
    await side.end();
  }
});
