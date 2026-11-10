import assert from "node:assert/strict";
import test from "node:test";
import { earliestConfiguredBlock, localServeConfig } from "./local";
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
