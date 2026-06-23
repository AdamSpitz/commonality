import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { artifactsDir, emit, fail, pass, truncate, workspacePath } from "../lib/result.mjs";

// Verifier-of-verifier fixture for meta.flakiness. Builds synthetic results
// directories and proves: (a) a pass/fail/pass history is flagged as unstable
// (uncertain) and named, (b) a check that legitimately alternates pass/uncertain
// is NOT flagged (uncertain is neutral, not a flip), and (c) a stable all-pass
// history is not flagged.

function runTarget(extraEnv) {
  return new Promise((resolve) => {
    const child = spawn("node", ["checks/meta/flakiness.mjs"], {
      cwd: workspacePath(),
      env: {
        ...process.env,
        VERIFIER_WORKSPACE: workspacePath(),
        VERIFIER_CHECK_ID: "known-bad-target:meta.flakiness",
        VERIFIER_INPUTS: "[]",
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

async function writeResult(resultsDir, checkId, index, status, durationMs) {
  const dir = path.join(resultsDir, checkId);
  await mkdir(dir, { recursive: true });
  // Encode ordering both in the filename (timestamp prefix) and the record's
  // timestamp so the target's chronological sort is exercised honestly.
  const stamp = new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString();
  const fileStamp = stamp.replace(/[:.]/g, "-");
  const record = { status, summary: `${checkId} run ${index}`, timestamp: stamp, checkId };
  if (durationMs !== undefined && durationMs !== null) record.durationMs = durationMs;
  await writeFile(
    path.join(dir, `${fileStamp}-${index}.json`),
    `${JSON.stringify(record, null, 2)}\n`,
    "utf8"
  );
}

async function buildResults(root, history) {
  const resultsDir = path.join(root, "results");
  for (const [checkId, runs] of Object.entries(history)) {
    for (let i = 0; i < runs.length; i += 1) {
      const run = runs[i];
      // Each run is either a bare status string (no duration) or a
      // [status, durationMs] pair so duration-drift cases can be expressed.
      const [status, durationMs] = Array.isArray(run) ? run : [run];
      await writeResult(resultsDir, checkId, i, status, durationMs);
    }
  }
  return resultsDir;
}

async function runCase(testCase) {
  const root = path.join(artifactsDir(), testCase.name);
  const resultsDir = await buildResults(root, testCase.history);
  const run = await runTarget({ VERIFIER_RESULTS: resultsDir });

  const base = {
    name: testCase.name,
    resultsDir,
    stdout: truncate(run.stdout),
    stderr: truncate(run.stderr),
    exitCode: run.exitCode
  };

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
      ? `${testCase.name}: meta.flakiness behaved as expected (${result.status}).`
      : `${testCase.name}: meta.flakiness returned ${result.status}, not as expected.`,
    findings
  };
}

function flaggedCheckIds(result) {
  return (Array.isArray(result.findings) ? result.findings : []).map((f) => f.title ?? "");
}

emit(async () => {
  const cases = [
    {
      name: "flapping-check-flagged",
      history: { "fixture.flapping": ["pass", "fail", "pass"] },
      check: (result) =>
        result.status === "uncertain" &&
        flaggedCheckIds(result).some((title) => title.includes("fixture.flapping"))
    },
    {
      name: "pass-uncertain-alternation-not-flagged",
      // uncertain is neutral; alternating pass/uncertain is not instability.
      history: { "fixture.advisory": ["pass", "uncertain", "pass", "uncertain"] },
      check: (result) => result.status === "pass"
    },
    {
      name: "stable-pass-not-flagged",
      history: { "fixture.stable": ["pass", "pass", "pass"] },
      check: (result) => result.status === "pass"
    },
    {
      name: "duration-drift-flagged",
      // All passing, but runtime creeps up well past the growth threshold and the
      // recent mean stays above the noise floor — the green-while-degrading case
      // the slow-degradation probe exists to catch.
      history: { "fixture.drifting": [["pass", 2000], ["pass", 2100], ["pass", 3200], ["pass", 3900]] },
      check: (result) =>
        result.status === "uncertain" &&
        flaggedCheckIds(result).some((title) => title.includes("fixture.drifting") && title.includes("slowing down"))
    },
    {
      name: "duration-stable-not-flagged",
      // All passing with steady runtime — no flips, no drift, must stay green.
      history: { "fixture.steady-runtime": [["pass", 3000], ["pass", 3100], ["pass", 3050], ["pass", 3000]] },
      check: (result) => result.status === "pass"
    },
    {
      name: "duration-noise-not-flagged",
      // Sub-second runtime that doubles is still below the noise floor and so
      // must not be flagged as drift.
      history: { "fixture.fast": [["pass", 40], ["pass", 50], ["pass", 70], ["pass", 90]] },
      check: (result) => result.status === "pass"
    }
  ];

  const results = await Promise.all(cases.map(runCase));
  const failures = results.filter((r) => !r.ok);
  const findings = { cases: results.map((r) => r.findings) };
  if (failures.length > 0) {
    return fail(`meta.flakiness known-bad fixtures: ${failures.length}/${results.length} fixture(s) behaved unexpectedly.`, { findings });
  }
  return pass(`meta.flakiness known-bad fixtures: all ${results.length} fixture(s) behaved as expected.`, { findings });
});
