import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { artifactsDir, emit, fail, pass, truncate, workspacePath } from "../lib/result.mjs";

// Verifier-of-verifier fixture for operations.page-load-timing. Proves the
// browser timing probe can both pass a tiny static build and reject a page that
// breaches its browser timing budgets, without depending on the real UI build.

const TARGET_SCRIPT = "checks/operations/page-load-timing.mjs";

function runTarget(inputs, extraEnv) {
  return new Promise((resolve) => {
    const child = spawn("node", [TARGET_SCRIPT], {
      cwd: workspacePath(),
      env: {
        ...process.env,
        VERIFIER_WORKSPACE: workspacePath(),
        VERIFIER_INPUTS: JSON.stringify(inputs),
        ...extraEnv
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => resolve({ error, stdout, stderr, exitCode: null }));
    child.on("close", (exitCode) => resolve({ stdout, stderr, exitCode }));
  });
}

function parseSingleResult(stdout) {
  const lines = stdout.trim().split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length !== 1) throw new Error(`Target emitted ${lines.length} stdout line(s), expected exactly one JSON Result.`);
  const result = JSON.parse(lines[0]);
  if (!result || typeof result.status !== "string" || typeof result.summary !== "string") {
    throw new Error("Target stdout was JSON but not a verifier Result with status and summary.");
  }
  return result;
}

function paramsInput(data) {
  return [{ kind: "params", data }];
}

async function writeFixtureDist(root, delayMs) {
  await mkdir(root, { recursive: true });
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Timing fixture</title><script>const end = performance.now() + ${delayMs}; while (performance.now() < end) {}</script></head><body><h1>Timing fixture</h1></body></html>`;
  await writeFile(path.join(root, "index.html"), html, "utf8");
}

async function runCase(testCase, fixtureRoot) {
  const targetArtifacts = path.join(fixtureRoot, testCase.name, "target-artifacts");
  await mkdir(targetArtifacts, { recursive: true });

  const distDir = path.relative(workspacePath(".."), path.join(fixtureRoot, testCase.name, "dist"));
  await writeFixtureDist(path.join(fixtureRoot, testCase.name, "dist"), testCase.delayMs);

  const inputs = paramsInput({
    skipBuild: true,
    distDir,
    pageTimeoutMs: 5000,
    networkIdleTimeoutMs: 5000,
    targets: [{ name: testCase.name, path: "/" }],
    budget: testCase.budget
  });

  const run = await runTarget(inputs, {
    VERIFIER_CHECK_ID: "known-bad-target:operations.page-load-timing",
    VERIFIER_RUN_ID: testCase.name,
    VERIFIER_ARTIFACTS_DIR: targetArtifacts
  });

  const base = { name: testCase.name, stdout: truncate(run.stdout), stderr: truncate(run.stderr), exitCode: run.exitCode, inputs };
  if (run.error) return { ok: false, summary: `${testCase.name}: could not launch target`, findings: { ...base, error: run.error.message } };

  let result;
  try {
    result = parseSingleResult(run.stdout);
  } catch (error) {
    return { ok: false, summary: `${testCase.name}: target did not emit a parseable Result`, findings: { ...base, parseError: error.message } };
  }

  const problems = Array.isArray(result.findings?.problems) ? result.findings.problems.join("\n") : "";
  const findings = { ...base, targetStatus: result.status, targetSummary: result.summary, targetProblems: truncate(problems, 2000), measurements: result.findings?.measurements };
  const ok = testCase.check(result, problems);
  return {
    ok,
    summary: ok ? `${testCase.name}: operations.page-load-timing behaved as expected (${result.status}).` : `${testCase.name}: operations.page-load-timing returned ${result.status}, not as expected.`,
    findings
  };
}

emit(async () => {
  const fixtureRoot = path.join(artifactsDir(), "fixture-dist");
  const cases = [
    {
      name: "fast-page-passes",
      delayMs: 0,
      budget: { maxLoadMs: 5000, maxNetworkIdleMs: 5000 },
      check: (result) => result.status === "pass"
    },
    {
      name: "load-budget-breach-fails",
      delayMs: 250,
      budget: { maxLoadMs: 50, maxNetworkIdleMs: 5000 },
      check: (result, problems) => result.status === "fail" && /load .*exceeds budget 50ms/.test(problems)
    }
  ];

  const results = [];
  for (const testCase of cases) results.push(await runCase(testCase, fixtureRoot));
  const failures = results.filter((r) => !r.ok);
  const findings = { cases: results.map((r) => r.findings) };
  if (failures.length > 0) return fail(`operations.page-load-timing known-bad fixtures: ${failures.length}/${results.length} fixture(s) behaved unexpectedly.`, { findings });
  return pass(`operations.page-load-timing known-bad fixtures: all ${results.length} fixture(s) behaved as expected.`, { findings });
});
