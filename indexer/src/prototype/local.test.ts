import assert from "node:assert/strict";
import test from "node:test";
import { earliestConfiguredBlock, hostedStoreConfig, localServeConfig } from "./local";
import type { Catalog } from "./types";

const catalog: Catalog = {
  sources: [{ name: "PublishedData", address: `0x${"ab".repeat(20)}`, startBlock: 41n, events: [] }],
  factories: [{
    source: { name: "Factory", address: `0x${"cd".repeat(20)}`, startBlock: 7n, events: [] },
    event: { type: "event", name: "Created", inputs: [] },
    parameter: "child",
    childName: "Child",
    childEvents: [],
  }],
};

test("local serve starts at the earliest configured block and uses hardhat finality", () => {
  assert.equal(earliestConfiguredBlock(catalog), 7n);
  const config = localServeConfig({ PONDER_CHAIN: "hardhat", INDEXER_SNAPSHOT_PATH: "/tmp/snap.json" }, 7n);
  assert.equal(config.fromBlock, 7n);
  assert.equal(config.intervalMs, 100);
  assert.equal(config.finality, "depth:0");
  assert.equal(config.out, "/tmp/snap.json");
  const hosted = localServeConfig({ PONDER_CHAIN: "base-sepolia", INDEXER_SNAPSHOT_PATH: "/tmp/snap.json" }, 0n);
  assert.equal(hosted.fromBlock, 1n);
  assert.equal(hosted.finality, "finalized");
  assert.equal(hosted.intervalMs, 12000);
});

test("hosted start uses a fresh schema and refuses Ponder's schema and a disabled spend guard", () => {
  const config = hostedStoreConfig({
    DATABASE_URL: "postgres://indexer/db",
    DATABASE_SCHEMA: "commonality_base_sepolia_v6",
  });
  assert.equal(config.url, "postgres://indexer/db");
  assert.equal(config.schema, "raw_log");
  assert.throws(() => hostedStoreConfig({
    DATABASE_URL: "postgres://indexer/db",
    DATABASE_SCHEMA: "raw_log",
    INDEXER_PROTOTYPE_SCHEMA: "raw_log",
  }), /Ponder DATABASE_SCHEMA/);
  assert.throws(() => hostedStoreConfig({ DATABASE_SCHEMA: "commonality_base_sepolia_v6" }), /DATABASE_URL/);
  assert.throws(() => hostedStoreConfig({
    DATABASE_URL: "postgres://indexer/db",
    INDEXER_SPEND_GUARD: "0",
  }), /spend guard/);
});
