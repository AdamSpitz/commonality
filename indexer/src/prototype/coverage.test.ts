import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAbiItem, type AbiEvent } from "viem";
import { admissionPlan, coverageOf, estimateReplay, steadyStateMonthlyCu } from "./coverage";
import { address, type Catalog } from "./types";

const event = parseAbiItem("event Changed(uint256 value)") as AbiEvent;
const parent = address(`0x${"11".repeat(20)}`);
const child = address(`0x${"22".repeat(20)}`);
const catalog: Catalog = { sources: [{ name: "Fixed", address: parent, startBlock: 10n, events: [event] }], factories: [] };

test("admission backfills a new address and refuses a changed start", () => {
  const before = coverageOf(catalog);
  const added = coverageOf({ sources: [...catalog.sources, { ...catalog.sources[0]!, address: child, startBlock: 4n }], factories: [] });
  assert.deepEqual(admissionPlan(before, added).backfill.map(source => source.address), [child]);
  assert.throws(() => admissionPlan(before, coverageOf({
    sources: [{ ...catalog.sources[0]!, startBlock: 11n }], factories: [],
  })), /coverage plan/);
});

test("replay estimate is windows times batches, not elapsed blocks", () => {
  const quiet = estimateReplay({ sources: [{ startBlock: 1n }, { startBlock: 50_000n }], head: 30_000n, eventBearingBlocks: 0n });
  assert.equal(quiet.logQueries, 3n);
  assert.equal(quiet.cu, 180n);
  const busy = estimateReplay({ sources: [{ startBlock: 1n }], head: 30_000n, eventBearingBlocks: 3n });
  assert.equal(busy.headerReads, 3n);
  assert.equal(busy.cu, quiet.cu + 60n);
});

test("a 12s quiet poll is 21.6M CU per 30-day month, not 7.2M", () => {
  assert.equal(steadyStateMonthlyCu(12_000, 100), 21_600_000);
  assert.equal(steadyStateMonthlyCu(4_000, 100), 64_800_000);
});
