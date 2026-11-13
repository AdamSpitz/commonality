import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { matchingPark } from "./parked-failures.mjs";

const item = {
  checkId: "example.check",
  owner: "engineering",
  reason: "Known expensive failure.",
  parkedOn: "2026-11-12",
  reviewAfter: "2027-02-12",
  evidenceIncludes: "prompt fingerprint"
};

const failing = {
  status: "fail",
  summary: "command failed",
  findings: { stderrTail: "Saved prompt fingerprint differs" }
};

test("a matching failure stays parked only until its review date", () => {
  assert.equal(matchingPark([item], "example.check", failing, new Date("2026-12-01T00:00:00Z"))?.checkId, "example.check");
  assert.equal(matchingPark([item], "example.check", failing, new Date("2027-02-13T00:00:00Z")), null);
  assert.equal(matchingPark([item], "example.check", { ...failing, findings: { stderrTail: "different bug" } }), null);
  assert.equal(matchingPark([item], "example.check", { status: "pass", summary: "ok" }), null);
});

test("PR validation does not treat a matching parked failure as current work", () => {
  const workspace = mkdtempSync(path.join(tmpdir(), "parked-"));
  writeFileSync(path.join(workspace, "parked-failures.json"), JSON.stringify({ items: [{ ...item, checkId: "automated.seed-implication-regression" }] }));
  const child = {
    kind: "check",
    id: "automated.seed-implication-regression",
    role: "optional",
    result: { ...failing, timestamp: "2026-11-12T21:13:31.411Z" }
  };
  const result = JSON.parse(execFileSync(process.execPath, [new URL("../validation/pr.mjs", import.meta.url).pathname], {
    env: { ...process.env, VERIFIER_WORKSPACE: workspace, VERIFIER_INPUTS: JSON.stringify([child]) },
    encoding: "utf8"
  }));
  assert.equal(result.status, "pass");
  assert.match(result.summary, /parked until 2027-02-12/);
});
