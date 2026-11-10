import assert from "node:assert/strict";
import { test } from "node:test";
import { commitSnapshot, eventQuerySql, provisionalTail, quoteIdent, type Sql } from "./postgres";
import type { Snapshot } from "./types";

const hash = `0x${"ab".repeat(32)}` as const;

function snapshot(rows: Snapshot["rows"], durable = 10n): Snapshot {
  return {
    version: 1, chainId: 84532, scope: "a".repeat(64), fromBlock: 1n,
    head: { number: 12n, hash, timestamp: 3n },
    durable: { number: durable, hash, timestamp: 2n },
    rows, children: [],
  };
}

test("schema names are a closed identifier set", () => {
  assert.equal(quoteIdent("raw_log"), "raw_log");
  assert.throws(() => quoteIdent("Raw-Log"), /Invalid prototype schema/);
  assert.throws(() => quoteIdent("public;drop"), /Invalid prototype schema/);
});

test("a commit rewrites only the provisional tail", () => {
  const kept = { id: "1", chainId: 1, contractAddress: "0x0000000000000000000000000000000000000001" as const, eventName: "E", blockNumber: "9", blockTimestamp: "1", transactionHash: hash, logIndex: 0, topic0: null, topic1: null, topic2: null, topic3: null, data: "0x" };
  const tail = { ...kept, id: "2", blockNumber: "11" };
  const next = snapshot([kept, tail], 12n);
  const delta = provisionalTail(snapshot([kept], 10n), next);
  assert.equal(delta.anchor, 10n);
  assert.deepEqual(delta.inserted.map(row => row.id), ["2"]);
  const historical = { ...kept, id: "3", blockNumber: "5" };
  assert.deepEqual(provisionalTail(snapshot([kept]), snapshot([historical, kept, tail], 12n)).inserted.map(row => row.id), ["3", "2"]);
  assert.throws(() => provisionalTail(snapshot([], 12n), snapshot([], 11n)), /regressed durable/);
});

test("commit SQL deletes above the anchor inside one transaction", async () => {
  const statements: string[] = [];
  const db: Sql = { async query(text) { statements.push(text); return { rows: [] }; } };
  const row = { id: "2", chainId: 84532, contractAddress: "0x0000000000000000000000000000000000000001" as const, eventName: "E", blockNumber: "11", blockTimestamp: "1", transactionHash: hash, logIndex: 0, topic0: null, topic1: null, topic2: null, topic3: null, data: "0x" };
  await commitSnapshot(db, "raw_log", snapshot([], 10n), snapshot([row], 12n));
  assert.deepEqual(statements.filter(sql => sql === "BEGIN" || sql === "COMMIT"), ["BEGIN", "COMMIT"]);
  assert.match(statements[1]!, /DELETE FROM raw_log\.events WHERE block_number > \$1/);
  assert.equal(statements.filter(sql => sql.startsWith("INSERT INTO raw_log.events")).length, 1);
});

test("event queries keep desc selection in ascending chain order", () => {
  const sql = eventQuerySql("raw_log", { order: "desc", limit: 2, chainId: 1, after: { blockNumber: 4n, logIndex: 1 } });
  assert.match(sql.text, /ORDER BY block_number DESC, log_index DESC LIMIT 2/);
  assert.deepEqual(sql.values, [1, "4", 1]);
  assert.throws(() => eventQuerySql("nope;", { order: "asc" }), /Invalid prototype schema/);
});
