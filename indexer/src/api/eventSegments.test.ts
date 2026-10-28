import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";
import {
  encodeSegmentTuples,
  eventSegmentBlocks,
  finalizedThroughBlock,
  immutableSegmentRanges,
  maybeGzip,
  segmentSha256,
  segmentResponseHeaders,
} from "./eventSegments.js";

assert.deepEqual(
  immutableSegmentRanges(49_998n, 50_000n),
  [],
);
assert.deepEqual(
  immutableSegmentRanges(99_998n, 50_000n),
  [{ fromBlock: 0n, toBlock: 49_999n }],
);
assert.deepEqual(
  immutableSegmentRanges(149_998n, 50_000n),
  [
    { fromBlock: 0n, toBlock: 49_999n },
    { fromBlock: 50_000n, toBlock: 99_999n },
  ],
);
assert.equal(finalizedThroughBlock(null, 12n), -1n);
assert.equal(finalizedThroughBlock(11n, 12n), -1n);
assert.equal(finalizedThroughBlock(100n, 12n), 88n);

const body = encodeSegmentTuples([{
  id: "1",
  contractAddress: "0xabc",
  blockNumber: 10n,
  blockTimestamp: 20n,
  transactionHash: "0x1",
  logIndex: 2,
  topic0: "0x0",
  topic1: null,
  topic2: null,
  topic3: null,
  data: null,
}]);
assert.equal(JSON.parse(body)[0][10], "0x");
assert.equal(segmentSha256(body), segmentSha256(body));
const gzipped = maybeGzip(body, "gzip");
assert.equal(gzipped.encoding, "gzip");
assert.equal(gunzipSync(gzipped.payload).toString(), body);
assert.equal(maybeGzip(body, "gzip;q=0, br").encoding, undefined);
assert.equal(maybeGzip(body, "br, gzip;q=0.5").encoding, "gzip");
assert.equal(segmentResponseHeaders("hash", true).vary, "Accept-Encoding");
assert.equal(eventSegmentBlocks(), 50_000n);

console.log("event segment tests passed");
