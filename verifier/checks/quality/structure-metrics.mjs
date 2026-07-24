import { spawn } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { emit, pass, uncertain, workspacePath, writeTextArtifact } from "../lib/result.mjs";

const METRIC_RULES = new Set(["complexity", "max-depth", "max-params", "max-lines", "max-lines-per-function"]);
const repoRoot = path.resolve(workspacePath(".."));

function runEslint(workspace) {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["eslint", ".", "--format", "json"], {
      cwd: path.join(repoRoot, workspace), stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", code => resolve({ code, stdout, stderr }));
  });
}

export function summarizeReports(reports) {
  const warnings = [];
  for (const report of reports) {
    for (const file of report.results) {
      for (const message of file.messages ?? []) {
        if (!METRIC_RULES.has(message.ruleId) || message.severity !== 1) continue;
        warnings.push({
          workspace: report.workspace,
          file: path.relative(repoRoot, file.filePath),
          rule: message.ruleId,
          line: message.line,
          message: message.message,
        });
      }
    }
  }
  const byRule = Object.fromEntries([...METRIC_RULES].map(rule => [rule, warnings.filter(w => w.rule === rule).length]));
  const fileCounts = new Map();
  for (const warning of warnings) fileCounts.set(warning.file, (fileCounts.get(warning.file) ?? 0) + 1);
  const hotspots = [...fileCounts].map(([file, count]) => ({ file, count }))
    .sort((a, b) => b.count - a.count || a.file.localeCompare(b.file)).slice(0, 20);
  return { total: warnings.length, byRule, hotspots, warnings };
}

async function previousCounts() {
  const resultsDir = workspacePath("results/quality.structure-metrics");
  try {
    const names = (await readdir(resultsDir)).filter(name => name.endsWith(".json")).sort().reverse();
    for (const name of names) {
      const result = JSON.parse(await readFile(path.join(resultsDir, name), "utf8"));
      const counts = result.findings?.counts;
      if (counts) return counts;
    }
  } catch { /* first run */ }
  return null;
}

function delta(current, previous) {
  if (!previous) return null;
  return {
    total: current.total - previous.total,
    byRule: Object.fromEntries([...METRIC_RULES].map(rule => [rule, current.byRule[rule] - (previous.byRule?.[rule] ?? 0)])),
  };
}

function markdown(summary, change) {
  const rows = Object.entries(summary.byRule).map(([rule, count]) => `| ${rule} | ${count} | ${change ? change.byRule[rule] : "—"} |`).join("\n");
  const hotspots = summary.hotspots.map((item, i) => `${i + 1}. \`${item.file}\` — ${item.count}`).join("\n") || "None.";
  return `# Advisory structure metrics\n\nGenerated artifacts, reports, coverage, and generated API docs are excluded by the shared ESLint metrics config. These numbers are advisory, never gates.\n\n**Total warnings:** ${summary.total}${change ? ` (${change.total >= 0 ? "+" : ""}${change.total} since previous run)` : " (first baseline)"}\n\n| Rule | Count | Change |\n|---|---:|---:|\n${rows}\n\n## Production-source hotspots\n\n${hotspots}\n`;
}

async function main() {
  const rootPackage = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));
  const reports = [];
  const errors = [];
  for (const workspace of rootPackage.workspaces) {
    const run = await runEslint(workspace);
    try {
      reports.push({ workspace, results: JSON.parse(run.stdout) });
    } catch {
      errors.push({ workspace, exitCode: run.code, stderr: run.stderr.slice(-1000) });
    }
  }
  const summary = summarizeReports(reports);
  const counts = { total: summary.total, byRule: summary.byRule };
  const change = delta(counts, await previousCounts());
  const artifact = await writeTextArtifact("report.md", markdown(summary, change), "text/markdown", "Grouped ESLint structure metrics and ranked source hotspots");
  const findings = { counts, change, hotspots: summary.hotspots, scanErrors: errors, note: "Advisory only; thresholds are not gates." };
  if (errors.length) return uncertain(`Structure metrics scanned ${reports.length} workspaces, but ${errors.length} could not be parsed.`, { findings, artifacts: [artifact] });
  return pass(`Advisory structure metrics: ${summary.total} warnings across ${reports.length} workspaces.`, { findings, artifacts: [artifact] });
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) emit(main);
