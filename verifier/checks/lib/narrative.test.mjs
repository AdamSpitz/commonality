import assert from "node:assert/strict";
import test from "node:test";

import { isReusableNarrativeResult } from "./narrative.mjs";

test("accepts a successful stored narrative", () => {
  const prior = { findings: { narrative: { model: "test-model" } } };
  assert.equal(isReusableNarrativeResult(prior, "# State of the project\n\nReady."), true);
});

test("rejects a stored result that records narrative generation failure", () => {
  const prior = { findings: { narrative: { error: "spawn pi ENOENT" } } };
  assert.equal(isReusableNarrativeResult(prior, "# Report unavailable"), false);
});

test("rejects a degraded report copied through an older memoized result", () => {
  const prior = { findings: { narrative: { memoized: true } } };
  assert.equal(
    isReusableNarrativeResult(prior, "\n  # Report unavailable\n\nThe rollup is unaffected."),
    false
  );
});
