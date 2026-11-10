import assert from "node:assert/strict";
import {
  chainSyncWatermarks,
  checkpointFromBlock,
  followCheckpointFromSync,
  upstreamIdFromAppMeta,
} from "./syncWatermark.js";

assert.equal(checkpointFromBlock(120n), "0000000000000120");
assert.equal(checkpointFromBlock(100n) < checkpointFromBlock(120n), true);
assert.throws(() => checkpointFromBlock(-1n), /invalid/);

const rows = chainSyncWatermarks([{
  chain_id: 84532n,
  chain_name: "baseSepolia",
  indexedThrough: 120n,
  finalizedThrough: 100n,
}]);
assert.equal(rows[0]?.indexedThrough, "120");
assert.equal(rows[0]?.finalizedThrough, "100");
assert.equal(rows[0]?.indexedCheckpoint, "0000000000000120");
assert.equal(rows[0]?.finalizedCheckpoint, "0000000000000100");
assert.equal(followCheckpointFromSync(rows, "84532", true), "120");
assert.equal(followCheckpointFromSync(rows, "84532", false), undefined);
assert.equal(followCheckpointFromSync(rows, undefined, true), undefined);
assert.equal(followCheckpointFromSync(rows, "1", true), undefined);
assert.equal(upstreamIdFromAppMeta({ build_id: "abc" }), "abc");
assert.equal(upstreamIdFromAppMeta({}), "");
assert.equal(upstreamIdFromAppMeta(null), "");
