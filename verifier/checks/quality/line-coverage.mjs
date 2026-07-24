import { readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { emit, pass, uncertain, workspacePath, writeTextArtifact } from "../lib/result.mjs";
import { runCommand } from "../lib/run-command.mjs";

const repoRoot = path.resolve(workspacePath(".."));
const uiDir = path.join(repoRoot, "ui");
const summaryPath = path.join(uiDir, "coverage", "coverage-summary.json");
const HOTSPOT_LIMIT = 20;

function metric(node, key) {
  const value = node?.[key];
  return typeof value?.pct === "number" ? {
    pct: value.pct,
    covered: value.covered,
    total: value.total,
    uncovered: Math.max(0, (value.total ?? 0) - (value.covered ?? 0)),
  } : null;
}

function isProductionFile(file) {
  const normalized = file.replaceAll("\\", "/");
  return normalized.includes("/src/")
    && !/(?:^|\/)(?:__tests__|test|tests|fixtures|generated)(?:\/|$)/i.test(normalized)
    && !/\.(?:test|spec)\.[^/]+$/i.test(normalized)
    && !/(?:^|\/)index\.[^/]+$/i.test(normalized)
    && !/(?:^|\/)generated\.[^/]+$/i.test(normalized);
}

export function summarizeCoverage(summary, root = repoRoot) {
  const totals = Object.fromEntries(
    ["lines", "branches", "functions", "statements"].map(key => [key, metric(summary.total, key)]),
  );
  const files = Object.entries(summary)
    .filter(([file]) => file !== "total" && isProductionFile(file))
    .map(([file, coverage]) => ({
      file: path.relative(root, file).replaceAll("\\", "/"),
      lines: metric(coverage, "lines"),
      branches: metric(coverage, "branches"),
    }))
    .filter(file => file.lines)
    .sort((a, b) => a.lines.pct - b.lines.pct
      || (b.branches?.uncovered ?? 0) - (a.branches?.uncovered ?? 0)
      || a.file.localeCompare(b.file));
  return { totals, files, hotspots: files.slice(0, HOTSPOT_LIMIT) };
}

function percentage(value) {
  return typeof value === "number" ? value : value?.pct;
}

export function coverageChange(current, previous) {
  if (!previous) return null;
  return Object.fromEntries(["lines", "branches", "functions", "statements"].map(key => {
    const currentPct = percentage(current[key]);
    const previousPct = percentage(previous[key]);
    return [key, currentPct == null || previousPct == null ? null : Number((currentPct - previousPct).toFixed(2))];
  }));
}

async function previousTotals() {
  const resultsDir = workspacePath("results/quality.line-coverage");
  try {
    const names = (await readdir(resultsDir)).filter(name => name.endsWith(".json")).sort().reverse();
    for (const name of names) {
      const result = JSON.parse(await readFile(path.join(resultsDir, name), "utf8"));
      const totals = result.findings?.totals;
      if (totals) return totals;
    }
  } catch { /* first run */ }
  return null;
}

function formatMetric(value) {
  return value == null ? "n/a" : `${value}%`;
}

function markdown(coverage, change) {
  const totalRows = Object.entries(coverage.totals).map(([name, value]) =>
    `| ${name} | ${formatMetric(value?.pct)} | ${change?.[name] == null ? "—" : `${change[name] >= 0 ? "+" : ""}${change[name]} pp`} |`,
  ).join("\n");
  const hotspotRows = coverage.hotspots.map((item, index) =>
    `| ${index + 1} | \`${item.file}\` | ${formatMetric(item.lines.pct)} | ${item.lines.uncovered} | ${item.branches?.uncovered ?? "n/a"} |`,
  ).join("\n") || "| — | None | — | — | — |";
  return `# UI line coverage\n\nAdvisory only: these totals and hotspots do not gate the build. Generated code, tests, and fixtures are excluded from the hotspot ranking.\n\n| Metric | Coverage | Change from previous run |\n|---|---:|---:|\n${totalRows}\n\n## Lowest-covered production files\n\n| Rank | File | Line coverage | Uncovered lines | Uncovered branches |\n|---:|---|---:|---:|---:|\n${hotspotRows}\n`;
}

async function main() {
  await rm(summaryPath, { force: true });
  const runResult = await runCommand(
    "npx",
    [
      "vitest", "run", "--coverage", "--coverage.provider=v8",
      "--coverage.reporter=json-summary", "--coverage.reportOnFailure=true",
      "--testTimeout=30000", "--hookTimeout=30000",
    ],
    { cwd: uiDir, timeoutMs: 1200000, label: "ui vitest --coverage" },
  );

  let summary;
  try {
    summary = JSON.parse(await readFile(summaryPath, "utf8"));
  } catch (error) {
    return uncertain(
      `Could not read UI coverage summary (${path.relative(repoRoot, summaryPath)}): ${error?.message ?? error}. Vitest exited ${runResult.status}.`,
      { findings: { vitestStatus: runResult.status, vitestSummary: runResult.summary } },
    );
  }

  const coverage = summarizeCoverage(summary);
  const change = coverageChange(coverage.totals, await previousTotals());
  const artifact = await writeTextArtifact(
    "report.md", markdown(coverage, change), "text/markdown",
    "UI coverage totals, change, and lowest-covered production files",
  );
  const findings = {
    workspace: "ui",
    totals: coverage.totals,
    change,
    hotspots: coverage.hotspots,
    productionFiles: coverage.files.length,
    vitestStatus: runResult.status,
    vitestSummary: runResult.summary,
    note: "Advisory report — not a gate. No threshold fails this check.",
  };

  if (coverage.totals.lines?.pct == null) {
    return uncertain("UI coverage summary had no total.lines percentage.", { findings, artifacts: [artifact] });
  }
  const totalText = Object.entries(coverage.totals).map(([key, value]) => `${key} ${formatMetric(value?.pct)}`).join(", ");
  if (runResult.status !== "pass") {
    return uncertain(`UI coverage was produced, but the instrumented test run ${runResult.status}: ${totalText}.`, { findings, artifacts: [artifact] });
  }
  return pass(`UI coverage — ${totalText}; ${coverage.files.length} production files ranked.`, { findings, artifacts: [artifact] });
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) emit(main);
