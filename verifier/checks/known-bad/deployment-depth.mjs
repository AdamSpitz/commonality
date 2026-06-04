import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { artifactsDir, emit, fail, pass, truncate, workspacePath } from "../lib/result.mjs";

// Verifier-of-verifier fixture for stack.deployment-depth. Builds synthetic
// results directories and proves: (a) a deep-stack set with NO passing run is
// reported as "never booted" (uncertain), (b) a set whose only passing run is
// older than the cadence is reported as stale (uncertain), (c) a recent passing
// run is reported as a fresh boot (pass), and crucially (d) an opt-in *refusal*
// (status "error") does NOT count as a boot — a stack that only ever refused to
// run must still read as "never booted".

function runTarget(extraEnv) {
  return new Promise((resolve) => {
    const child = spawn("node", ["checks/stack/deployment-depth.mjs"], {
      cwd: workspacePath(),
      env: {
        ...process.env,
        VERIFIER_WORKSPACE: workspacePath(),
        VERIFIER_CHECK_ID: "known-bad-target:stack.deployment-depth",
        VERIFIER_INPUTS: JSON.stringify([{ kind: "params", data: { maxAgeDays: 7 } }]),
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
  if (lines.length !== 1) {
    throw new Error(`Target emitted ${lines.length} stdout line(s), expected exactly one JSON Result.`);
  }
  const result = JSON.parse(lines[0]);
  if (!result || typeof result.status !== "string" || typeof result.summary !== "string") {
    throw new Error("Target stdout was JSON but not a verifier Result with status and summary.");
  }
  return result;
}

// Write one synthetic result record, `daysAgo` before now, with the given status.
async function writeResult(resultsDir, checkId, index, status, daysAgo) {
  const dir = path.join(resultsDir, checkId);
  await mkdir(dir, { recursive: true });
  const stamp = new Date(Date.now() - daysAgo * 86400000 + index * 1000).toISOString();
  const fileStamp = stamp.replace(/[:.]/g, "-");
  await writeFile(
    path.join(dir, `${fileStamp}-${index}.json`),
    `${JSON.stringify({ status, summary: `${checkId} run ${index}`, timestamp: stamp, checkId }, null, 2)}\n`,
    "utf8"
  );
}

async function buildResults(root, history) {
  const resultsDir = path.join(root, "results");
  for (const [checkId, records] of Object.entries(history)) {
    for (let i = 0; i < records.length; i += 1) {
      await writeResult(resultsDir, checkId, i, records[i].status, records[i].daysAgo);
    }
  }
  return resultsDir;
}

async function runCase(testCase) {
  const root = path.join(artifactsDir(), testCase.name);
  const resultsDir = await buildResults(root, testCase.history);
  const run = await runTarget({ VERIFIER_RESULTS: resultsDir });

  const base = { name: testCase.name, resultsDir, stdout: truncate(run.stdout), stderr: truncate(run.stderr), exitCode: run.exitCode };
  if (run.error) {
    return { ok: false, summary: `${testCase.name}: could not launch target`, findings: { ...base, error: run.error.message } };
  }

  let result;
  try {
    result = parseSingleResult(run.stdout);
  } catch (error) {
    return { ok: false, summary: `${testCase.name}: target did not emit a parseable Result`, findings: { ...base, parseError: error.message } };
  }

  const findings = { ...base, targetStatus: result.status, targetSummary: result.summary, targetFindings: result.findings };
  const ok = testCase.check(result);
  return {
    ok,
    summary: ok
      ? `${testCase.name}: stack.deployment-depth behaved as expected (${result.status}).`
      : `${testCase.name}: stack.deployment-depth returned ${result.status}, not as expected.`,
    findings
  };
}

emit(async () => {
  const cases = [
    {
      name: "never-booted-flagged",
      history: { "stack.fresh-seeded": [{ status: "error", daysAgo: 1 }] },
      check: (r) => r.status === "uncertain" && /never/.test(r.summary)
    },
    {
      name: "opt-in-refusal-is-not-a-boot",
      // Many recent refusals must still read as "never booted".
      history: {
        "stack.fresh-seeded": [{ status: "error", daysAgo: 0 }, { status: "error", daysAgo: 1 }],
        "stack.user-journeys": [{ status: "error", daysAgo: 0 }]
      },
      check: (r) => r.status === "uncertain" && r.findings?.lastEndToEndBootDays === null
    },
    {
      name: "stale-boot-flagged",
      history: { "stack.fresh-seeded": [{ status: "pass", daysAgo: 30 }] },
      check: (r) => r.status === "uncertain" && /stale|older/.test(r.summary) && r.findings?.lastEndToEndBootDays === 30
    },
    {
      name: "fresh-boot-passes",
      history: {
        "stack.fresh-seeded": [{ status: "pass", daysAgo: 2 }],
        "stack.user-journeys": [{ status: "error", daysAgo: 0 }]
      },
      check: (r) => r.status === "pass" && r.findings?.lastEndToEndBootDays === 2
    }
  ];

  const results = await Promise.all(cases.map(runCase));
  const failures = results.filter((r) => !r.ok);
  const findings = { cases: results.map((r) => r.findings) };
  if (failures.length > 0) {
    return fail(`stack.deployment-depth known-bad fixtures: ${failures.length}/${results.length} fixture(s) behaved unexpectedly.`, { findings });
  }
  return pass(`stack.deployment-depth known-bad fixtures: all ${results.length} fixture(s) behaved as expected.`, { findings });
});
