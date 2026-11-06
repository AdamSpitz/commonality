import assert from "node:assert/strict";
import test from "node:test";
import {
  EventCursorError,
  assertCursorMatchesRequest,
  decodeEventFeedCursor,
  encodeEventFeedCursor,
  eventFeedScope,
  isAfterCursor,
} from "./eventCursor.js";

const scope = eventFeedScope({
  chainId: "1",
  eventName: "DirectSupport",
  topic1_in: "0xaa,0xbb",
});

test("cursor round-trips and rejects a mismatched scope or checkpoint", () => {
  const encoded = encodeEventFeedCursor({
    blockNumber: "42",
    logIndex: 7,
    checkpoint: "100",
    scope,
  });
  const decoded = decodeEventFeedCursor(encoded);
  assert.equal(decoded.logIndex, 7);
  assert.doesNotThrow(() => assertCursorMatchesRequest(decoded, scope, "100"));
  assert.throws(
    () => assertCursorMatchesRequest(decoded, "other", "100"),
    EventCursorError,
  );
  assert.throws(
    () => assertCursorMatchesRequest(decoded, scope, "101"),
    EventCursorError,
  );
});

test("within a block, only a greater log index is after the cursor", () => {
  const cursor = { blockNumber: "5", logIndex: 2 };
  assert.equal(isAfterCursor({ blockNumber: "5", logIndex: 2 }, cursor), false);
  assert.equal(isAfterCursor({ blockNumber: "5", logIndex: 3 }, cursor), true);
  assert.equal(isAfterCursor({ blockNumber: "4", logIndex: 99 }, cursor), false);
  assert.equal(isAfterCursor({ blockNumber: "6", logIndex: 0 }, cursor), true);
});

test("malformed cursors fail closed", () => {
  assert.throws(() => decodeEventFeedCursor("not-a-cursor"), EventCursorError);
});
