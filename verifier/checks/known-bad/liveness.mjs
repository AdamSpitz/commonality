import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { artifactsDir, emit, fail, pass, truncate, workspacePath } from "../lib/result.mjs";

function runTarget(extraEnv) {
  return new Promise((resolve) => {
    const child = spawn("node", ["checks/meta/liveness.mjs"], {
      cwd: workspacePath(),
      env: {
        ...process.env,
        VERIFIER_WORKSPACE: workspacePath(),
        VERIFIER_CHECK_ID: "known-bad-target:meta.liveness",
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

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function makeCaseFixture(root, testCase) {
  const checksDir = path.join(root, "checks");
  const stateDir = path.join(root, "state");
  const def = {
    id: testCase.checkId,
    description: testCase.description,
    trigger: { type: "cron", everyMinutes: 5 },
    command: ["node", "noop.mjs"],
    timeoutMs: 1000
  };
  await writeJson(path.join(checksDir, `${testCase.checkId}.def.json`), def);

  if (testCase.state) {
    await writeJson(path.join(stateDir, `${testCase.checkId}.json`), testCase.state);
  } else {
    await mkdir(stateDir, { recursive: true });
  }

  return { checksDir, stateDir };
}

async function runCase(testCase) {
  const root = path.join(artifactsDir(), testCase.name);
  const { checksDir, stateDir } = await makeCaseFixture(root, testCase);
  const run = await runTarget({ VERIFIER_CHECKS: checksDir, VERIFIER_STATE: stateDir });

  const baseFindings = {
    name: testCase.name,
    checksDir,
    stateDir,
    stdout: truncate(run.stdout),
    stderr: truncate(run.stderr),
    exitCode: run.exitCode
  };

  if (run.error) {
    return { ok: false, summary: `${testCase.name}: could not launch target`, findings: { ...baseFindings, error: run.error.message } };
  }

  let result;
  try {
    result = parseSingleResult(run.stdout);
  } catch (error) {
    return { ok: false, summary: `${testCase.name}: target did not emit a parseable Result`, findings: { ...baseFindings, parseError: error.message } };
  }

  const findings = { ...baseFindings, targetStatus: result.status, targetSummary: result.summary, targetFindings: result.findings };
  const expected = result.status === "fail" && result.summary.includes(testCase.expectedSummaryFragment);
  if (expected) {
    return { ok: true, summary: `${testCase.name}: liveness rejected fixture with fail.`, findings };
  }
  return { ok: false, summary: `${testCase.name}: liveness unexpectedly returned ${result.status}.`, findings };
}

emit(async () => {
  const now = Date.now();
  const cases = [
    {
      name: "never-run-check",
      checkId: "fixture.never-run",
      description: "Known-bad check with no state file.",
      state: null,
      expectedSummaryFragment: "silent or overdue"
    },
    {
      name: "overdue-check",
      checkId: "fixture.overdue",
      description: "Known-bad check with a nextRunAt far in the past.",
      state: { lastRunAt: new Date(now - 60 * 60 * 1000).toISOString(), nextRunAt: new Date(now - 30 * 60 * 1000).toISOString() },
      expectedSummaryFragment: "silent or overdue"
    }
  ];

  const results = await Promise.all(cases.map(runCase));
  const failures = results.filter((result) => !result.ok);
  const findings = { cases: results.map((result) => result.findings) };
  if (failures.length > 0) {
    return fail(`meta.liveness known-bad fixtures: ${failures.length}/${results.length} fixture(s) were not rejected.`, { findings });
  }
  return pass(`meta.liveness known-bad fixtures: all ${results.length} fixture(s) were rejected.`, { findings });
});
