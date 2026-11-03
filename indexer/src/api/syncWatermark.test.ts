import assert from "node:assert/strict";
import {
  blockFromPonderCheckpoint,
  chainSyncWatermarks,
  followCheckpointFromSync,
} from "./syncWatermark.js";

function checkpoint(block: bigint): string {
  return `${"1".repeat(10)}${"0".repeat(16)}${block.toString().padStart(16, "0")}${"0".repeat(16)}5${"0".repeat(16)}`;
}

const latest = checkpoint(120n);
const finalized = checkpoint(100n);

assert.equal(blockFromPonderCheckpoint(latest), "120");
assert.throws(() => blockFromPonderCheckpoint("1"), /invalid/);

const rows = chainSyncWatermarks([{
  chain_id: 84532n,
  chain_name: "baseSepolia",
  latest_checkpoint: latest,
  finalized_checkpoint: finalized,
}]);
assert.equal(rows[0]?.indexedThrough, "120");
assert.equal(rows[0]?.finalizedThrough, "100");
assert.equal(followCheckpointFromSync(rows, "84532", true), "120");
assert.equal(followCheckpointFromSync(rows, "84532", false), undefined);
assert.equal(followCheckpointFromSync(rows, undefined, true), undefined);
assert.equal(followCheckpointFromSync(rows, "1", true), undefined);
