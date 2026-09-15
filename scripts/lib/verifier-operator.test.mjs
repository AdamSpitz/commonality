import test from "node:test";
import assert from "node:assert/strict";
import { affectedChecks, formatDuration, pathMatches, profileFor, summarizeProfiles } from "./verifier-operator.mjs";

test("maps changed paths to checks and reports unmapped paths", () => {
  const result = affectedChecks(["indexer/src/a.ts", "mystery.txt"], [
    { paths: ["indexer/"], checks: ["indexer.check", "shared.check"] },
    { paths: ["indexer/src"], checks: ["shared.check"] },
  ]);
  assert.deepEqual(result.checks, ["indexer.check", "shared.check"]);
  assert.deepEqual(result.unmapped, ["mystery.txt"]);
});

test("path matching supports directories and filename prefixes", () => {
  assert.equal(pathMatches("ui/src/a.ts", "ui/"), true);
  assert.equal(pathMatches("scripts/verifier-go.mjs", "scripts/verifier-"), true);
  assert.equal(pathMatches("sdkish/a.ts", "sdk/"), false);
});

test("explicit LLM declarations beat prefix defaults", () => {
  const policy = { costProfiles: { llm: { tokens: "high" }, instant: { tokens: "none" } }, defaultCosts: [{ idPrefix: "meta.", cost: "instant" }] };
  assert.equal(profileFor("meta.review", { cost: "llm" }, policy).key, "llm");
});

test("summarizes aggregate consequences", () => {
  const summary = summarizeProfiles([
    { profile: { estimatedSeconds: 30, tokens: "none", effects: ["restart"] } },
    { profile: { estimatedSeconds: 90, tokens: "high", effects: ["restart", "write"] } },
  ]);
  assert.deepEqual(summary, { seconds: 120, effects: ["restart", "write"], requires: [], llmCount: 1 });
  assert.equal(formatDuration(summary.seconds), "about 2m");
});

