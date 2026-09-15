import test from "node:test";
import assert from "node:assert/strict";
import { affectedChecks, formatDuration, freshnessFor, pathMatches, presentationFor, profileFor, summarizeProfiles } from "./verifier-operator.mjs";

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

test("classifies old and code-invalidated evidence independently from status", () => {
  const now = Date.parse("2026-09-15T12:00:00Z");
  assert.deepEqual(freshnessFor({ timestamp: "2026-09-15T11:00:00Z" }, { now, maxAgeMinutes: 120 }), {
    stale: false, reasons: [], ageMinutes: 60, maxAgeMinutes: 120,
  });
  const stale = freshnessFor({ timestamp: "2026-09-01T12:00:00Z", status: "fail" }, { now, maxAgeMinutes: 120, codeChanged: true });
  assert.equal(stale.stale, true);
  assert.equal(stale.reasons.length, 2);
});

test("presents measured time and token cost on independent axes", () => {
  const value = presentationFor({ durationMs: 72000 }, { estimatedSeconds: 2, tokens: "high", effects: ["writes"] }, { stale: false, reasons: [] });
  assert.deepEqual(value.cost, { duration: "~2m", durationSource: "last run", tokens: "high", requires: [], effects: ["writes"] });
});
