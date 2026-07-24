import assert from "node:assert/strict";
import test from "node:test";
import { summarizeReports } from "./structure-metrics.mjs";

test("groups metric warnings and ranks hotspots without non-metric warnings", () => {
  const summary = summarizeReports([{
    workspace: "ui",
    results: [
      { filePath: "/home/adam/Projects/commonality/ui/src/b.ts", messages: [
        { ruleId: "complexity", severity: 1, line: 2, message: "complex" },
        { ruleId: "max-depth", severity: 1, line: 3, message: "deep" },
      ] },
      { filePath: "/home/adam/Projects/commonality/ui/src/a.ts", messages: [
        { ruleId: "max-params", severity: 1, line: 1, message: "params" },
        { ruleId: "no-unused-vars", severity: 2, line: 1, message: "unused" },
      ] },
    ],
  }]);

  assert.equal(summary.total, 3);
  assert.equal(summary.byRule.complexity, 1);
  assert.equal(summary.byRule["max-lines"], 0);
  assert.deepEqual(summary.hotspots.map(({ file, count }) => ({ file, count })), [
    { file: "ui/src/b.ts", count: 2 },
    { file: "ui/src/a.ts", count: 1 },
  ]);
});
