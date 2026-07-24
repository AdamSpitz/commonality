import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { emit, pass, uncertain, workspacePath } from "../lib/result.mjs";
import { runCommand } from "../lib/run-command.mjs";

// Repo root is one level above the verifier workspace.
const repoRoot = path.resolve(workspacePath(".."));
const uiDir = path.join(repoRoot, "ui");
const summaryPath = path.join(uiDir, "coverage", "coverage-summary.json");

function pct(node, key) {
  const value = node?.[key]?.pct;
  return typeof value === "number" ? value : null;
}

emit(async () => {
  // Remove any prior summary so a failed run cannot accidentally report stale data.
  await rm(summaryPath, { force: true });

  // Run the UI Vitest suite under v8 coverage, emitting a machine-readable summary.
  const runResult = await runCommand(
    "npx",
    [
      "vitest",
      "run",
      "--coverage",
      "--coverage.provider=v8",
      "--coverage.reporter=json-summary",
      "--coverage.reportOnFailure=true",
      // Instrumentation makes a few UI tests exceed the suite's normal 5s limit.
      "--testTimeout=15000",
    ],
    { cwd: uiDir, timeoutMs: 840000, label: "ui vitest --coverage" }
  );

  let summary;
  try {
    summary = JSON.parse(await readFile(summaryPath, "utf8"));
  } catch (error) {
    return uncertain(
      `Could not read UI coverage summary (${path.relative(repoRoot, summaryPath)}): ${error?.message ?? error}. Vitest exited ${runResult.status}.`,
      { findings: { vitestStatus: runResult.status, vitestSummary: runResult.summary } }
    );
  }

  const total = summary.total ?? {};
  const totals = {
    lines: pct(total, "lines"),
    branches: pct(total, "branches"),
    functions: pct(total, "functions"),
    statements: pct(total, "statements"),
  };

  const findings = {
    workspace: "ui",
    totals,
    vitestStatus: runResult.status,
    note: "Advisory report — not a gate. No threshold fails this check.",
  };

  if (totals.lines === null) {
    return uncertain("UI coverage summary had no total.lines percentage.", { findings });
  }
  if (runResult.status !== "pass") {
    return uncertain(
      `UI coverage was produced, but the instrumented test run ${runResult.status}: lines ${totals.lines}%, branches ${totals.branches}%, functions ${totals.functions}%, statements ${totals.statements}%.`,
      { findings },
    );
  }
  return pass(
    `UI coverage — lines ${totals.lines}%, branches ${totals.branches}%, functions ${totals.functions}%, statements ${totals.statements}%.`,
    { findings }
  );
});
