import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { artifactsDir, emit, fail, pass, truncate, workspacePath } from "../lib/result.mjs";

// Verifier-of-verifier fixture for automated.dependency-audit. Proves the audit
// gate fails high/critical direct or production vulnerabilities, ignores
// dev-only high vulnerabilities by policy, and honors the explicit allowlist.
//
// Hermetic: the target check reads fixture npm-audit JSON from
// COMMONALITY_DEPENDENCY_AUDIT_FIXTURE_DIR instead of invoking the networked npm
// audit command.

const TARGET_SCRIPT = "checks/automated/dependency-audit.mjs";

function auditJson(vulnerabilities) {
  return {
    auditReportVersion: 2,
    vulnerabilities,
    metadata: {
      vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 },
      dependencies: { prod: 1, dev: 1, optional: 0, peer: 0, peerOptional: 0, total: 2 }
    }
  };
}

function highVuln(overrides = {}) {
  return {
    name: "bad-direct",
    severity: "high",
    isDirect: true,
    via: [{ title: "fixture vulnerability" }],
    effects: [],
    range: "<=1.0.0",
    nodes: ["node_modules/bad-direct"],
    fixAvailable: true,
    ...overrides
  };
}

function parseSingleResult(stdout) {
  const lines = stdout.trim().split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length !== 1) throw new Error(`Target emitted ${lines.length} stdout line(s), expected one JSON Result.`);
  const result = JSON.parse(lines[0]);
  if (!result || typeof result.status !== "string" || typeof result.summary !== "string") {
    throw new Error("Target stdout was JSON but not a verifier Result with status and summary.");
  }
  return result;
}

async function writeFixture(dir, { full, production }) {
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "full.json"), JSON.stringify(full, null, 2), "utf8");
  await writeFile(path.join(dir, "production.json"), JSON.stringify(production, null, 2), "utf8");
}

function runTarget({ fixtureDir, allowlist, targetArtifacts, runId }) {
  const inputs = [{ kind: "file", path: "fixture-allowlist.json", as: "allowlist", data: allowlist }];
  return new Promise((resolve) => {
    const child = spawn("node", [TARGET_SCRIPT], {
      cwd: workspacePath(),
      env: {
        ...process.env,
        COMMONALITY_DEPENDENCY_AUDIT_FIXTURE_DIR: fixtureDir,
        VERIFIER_WORKSPACE: workspacePath(),
        VERIFIER_INPUTS: JSON.stringify(inputs),
        VERIFIER_CHECK_ID: "known-bad-target:automated.dependency-audit",
        VERIFIER_RUN_ID: runId,
        VERIFIER_ARTIFACTS_DIR: targetArtifacts
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => resolve({ error, stdout, stderr, exitCode: null, inputs }));
    child.on("close", (exitCode) => resolve({ stdout, stderr, exitCode, inputs }));
  });
}

async function runCase(testCase, baseDir) {
  const fixtureDir = path.join(baseDir, testCase.name, "fixture");
  const targetArtifacts = path.join(baseDir, testCase.name, "target-artifacts");
  await writeFixture(fixtureDir, testCase.fixture);
  await mkdir(targetArtifacts, { recursive: true });

  const run = await runTarget({ fixtureDir, allowlist: testCase.allowlist ?? "[]", targetArtifacts, runId: testCase.name });
  const base = { name: testCase.name, stdout: truncate(run.stdout), stderr: truncate(run.stderr), exitCode: run.exitCode, inputs: run.inputs };
  if (run.error) return { ok: false, summary: `${testCase.name}: could not launch target`, findings: { ...base, error: run.error.message } };

  let result;
  try {
    result = parseSingleResult(run.stdout);
  } catch (error) {
    return { ok: false, summary: `${testCase.name}: target did not emit a parseable Result`, findings: { ...base, parseError: error.message } };
  }

  const reportable = result.findings?.highOrCriticalDirectOrProduction ?? [];
  const ok = testCase.check(result, reportable);
  return {
    ok,
    summary: ok
      ? `${testCase.name}: automated.dependency-audit behaved as expected (${result.status}).`
      : `${testCase.name}: automated.dependency-audit returned ${result.status}, not as expected.`,
    findings: { ...base, targetStatus: result.status, targetSummary: result.summary, reportable }
  };
}

emit(async () => {
  const directHigh = highVuln();
  const devOnlyHigh = highVuln({ name: "bad-dev-only", isDirect: false });
  const cases = [
    {
      name: "direct-high-fails",
      fixture: { full: auditJson({ "bad-direct": directHigh }), production: auditJson({}) },
      check: (result, reportable) => result.status === "fail" && reportable.some((v) => v.name === "bad-direct")
    },
    {
      name: "production-transitive-high-fails",
      fixture: { full: auditJson({ "bad-prod-transitive": highVuln({ name: "bad-prod-transitive", isDirect: false }) }), production: auditJson({ "bad-prod-transitive": highVuln({ name: "bad-prod-transitive", isDirect: false }) }) },
      check: (result, reportable) => result.status === "fail" && reportable.some((v) => v.name === "bad-prod-transitive" && v.production)
    },
    {
      name: "dev-only-high-passes",
      fixture: { full: auditJson({ "bad-dev-only": devOnlyHigh }), production: auditJson({}) },
      check: (result, reportable) => result.status === "pass" && reportable.length === 0
    },
    {
      name: "allowlisted-direct-high-passes",
      fixture: { full: auditJson({ "bad-direct": directHigh }), production: auditJson({}) },
      allowlist: JSON.stringify(["bad-direct"]),
      check: (result, reportable) => result.status === "pass" && reportable.length === 0
    }
  ];

  const results = [];
  for (const testCase of cases) results.push(await runCase(testCase, artifactsDir()));
  const failures = results.filter((r) => !r.ok);
  const findings = { cases: results.map((r) => r.findings) };
  if (failures.length > 0) {
    return fail(`automated.dependency-audit known-bad fixtures: ${failures.length}/${results.length} fixture(s) behaved unexpectedly.`, { findings });
  }
  return pass(`automated.dependency-audit known-bad fixtures: all ${results.length} fixture(s) behaved as expected.`, { findings });
});
