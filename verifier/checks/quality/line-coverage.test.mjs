import assert from "node:assert/strict";
import test from "node:test";
import { coverageChange, summarizeCoverage } from "./line-coverage.mjs";

function metrics(pct, covered = 8, total = 10) {
  return { pct, covered, total, skipped: 0 };
}

function fileCoverage(linePct, branchPct = 50) {
  return {
    lines: metrics(linePct),
    branches: metrics(branchPct, 2, 4),
    functions: metrics(75),
    statements: metrics(linePct),
  };
}

test("ranks production files by line coverage and reports uncovered branches", () => {
  const summary = {
    total: fileCoverage(80, 70),
    "/repo/ui/src/good.ts": fileCoverage(90, 50),
    "/repo/ui/src/weak.ts": fileCoverage(20, 25),
  };
  const result = summarizeCoverage(summary, "/repo");
  assert.deepEqual(result.files.map(file => file.file), ["ui/src/weak.ts", "ui/src/good.ts"]);
  assert.equal(result.files[0].lines.uncovered, 2);
  assert.equal(result.files[0].branches.uncovered, 2);
  assert.equal(result.totals.lines.pct, 80);
});

test("excludes generated code, tests, and fixtures from production hotspots", () => {
  const summary = {
    total: fileCoverage(80),
    "/repo/ui/src/real.ts": fileCoverage(60),
    "/repo/ui/src/thing.test.ts": fileCoverage(1),
    "/repo/ui/src/__tests__/helper.ts": fileCoverage(1),
    "/repo/ui/src/fixtures/data.ts": fileCoverage(1),
    "/repo/ui/src/generated/client.ts": fileCoverage(1),
    "/repo/ui/src/components/index.ts": fileCoverage(1),
    "/repo/ui/e2e/journey.ts": fileCoverage(1),
  };
  assert.deepEqual(summarizeCoverage(summary, "/repo").files.map(file => file.file), ["ui/src/real.ts"]);
});

test("calculates percentage-point change from the previous run", () => {
  const current = { lines: metrics(80.25), branches: metrics(71), functions: null, statements: metrics(82) };
  const previous = { lines: metrics(79), branches: metrics(72.5), functions: metrics(50), statements: metrics(82) };
  assert.deepEqual(coverageChange(current, previous), {
    lines: 1.25,
    branches: -1.5,
    functions: null,
    statements: 0,
  });
  assert.equal(coverageChange(current, null), null);
  assert.equal(coverageChange(current, { lines: 79 }).lines, 1.25);
});
