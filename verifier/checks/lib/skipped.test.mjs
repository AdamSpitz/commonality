import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { classifyChildren, makeSummary, rollupStatus, statusCounts, withFreshness } from "./rollup.mjs";

const skippedWorker = {
  kind: "check", id: "guarded.check", role: "required",
  result: { status: "skipped", summary: "Opt-in required", timestamp: "2020-01-01T00:00:00Z" }
};

test("skipped evidence stays explicitly skipped in supervisor summaries even when old", () => {
  const workers = withFreshness([skippedWorker], { maxAgeMinutes: 1 });
  const classification = classifyChildren(workers);
  assert.equal(rollupStatus({ type: "anyFail" }, workers), "uncertain");
  assert.equal(classification.skippedByPolicy.length, 1);
  assert.equal(classification.staleResults.length, 0);
  const summary = makeSummary("Fixture", "uncertain", workers, statusCounts(workers), classification, []);
  assert.match(summary, /1 skipped/);
  assert.doesNotMatch(summary, /no core checks/);
});

function prResult(children) {
  return JSON.parse(execFileSync(process.execPath, [new URL("../validation/pr.mjs", import.meta.url).pathname], {
    env: { ...process.env, VERIFIER_INPUTS: JSON.stringify(children) }, encoding: "utf8"
  }));
}

test("PR validation cannot pass with skipped required evidence", () => {
  assert.equal(prResult([skippedWorker]).status, "uncertain");
});

test("PR validation still accepts old passing evidence and ignores absent optional evidence", () => {
  assert.equal(prResult([
    { ...skippedWorker, result: { ...skippedWorker.result, status: "pass" } },
    { kind: "check", id: "optional.check", role: "optional", result: null }
  ]).status, "pass");
});
