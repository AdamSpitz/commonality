import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { emit, fail, pass, readInputs, truncate, workspacePath } from "../lib/result.mjs";

function paramsInput(inputs) {
  return Object.assign({}, ...inputs.filter((input) => input.kind === "params").map((input) => input.data ?? {}));
}

function fileInputs(inputs) {
  return inputs.filter((input) => input.kind === "file");
}

async function buildTargetInputs(params, inputs) {
  const explicitInputs = Array.isArray(params.targetInputs) ? params.targetInputs : [];
  const fixtureInputs = await Promise.all(fileInputs(inputs).map(async (input) => {
    const content = input.content ?? await readFile(workspacePath(input.path), "utf8");
    return { ...input, content };
  }));

  return [...fixtureInputs, ...explicitInputs];
}

function caseParams(params) {
  if (Array.isArray(params.cases) && params.cases.length > 0) {
    return params.cases.map((testCase) => ({
      ...params,
      ...testCase,
      label: testCase.label ?? params.label,
      cases: undefined
    }));
  }
  return [params];
}

function runTarget({ targetScript, targetInputs, extraEnv = {} }) {
  return new Promise((resolve) => {
    const child = spawn("node", [targetScript], {
      cwd: workspacePath(),
      env: {
        ...process.env,
        VERIFIER_WORKSPACE: workspacePath(),
        VERIFIER_INPUTS: JSON.stringify(targetInputs),
        VERIFIER_CHECK_ID: `known-bad-target:${targetScript}`,
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
  const parsed = JSON.parse(lines[0]);
  if (!parsed || typeof parsed.status !== "string" || typeof parsed.summary !== "string") {
    throw new Error("Target stdout was JSON but not a verifier Result with status and summary.");
  }
  return parsed;
}

async function runCase(params, inputs) {
  const targetScript = params.targetScript;
  if (typeof targetScript !== "string" || targetScript.length === 0) {
    throw new Error("Missing params.targetScript.");
  }

  const expectedStatuses = new Set(params.expectedStatuses ?? ["fail", "uncertain"]);
  const targetInputs = await buildTargetInputs(params, inputs);
  const run = await runTarget({ targetScript, targetInputs, extraEnv: params.extraEnv });

  if (run.error) {
    throw new Error(`Could not launch target: ${run.error.message}`);
  }

  let targetResult;
  try {
    targetResult = parseSingleResult(run.stdout);
  } catch (error) {
    return {
      ok: false,
      summary: `${params.label ?? targetScript}: known-bad target did not emit a parseable single Result.`,
      findings: {
        label: params.label,
        targetScript,
        expectedStatuses: [...expectedStatuses],
        exitCode: run.exitCode,
        stdout: truncate(run.stdout),
        stderr: truncate(run.stderr),
        parseError: error.message
      }
    };
  }

  const findings = {
    label: params.label,
    targetScript,
    expectedStatuses: [...expectedStatuses],
    targetStatus: targetResult.status,
    targetSummary: targetResult.summary,
    targetExitCode: run.exitCode,
    targetFindings: targetResult.findings,
    targetStderr: truncate(run.stderr)
  };

  if (expectedStatuses.has(targetResult.status)) {
    return {
      ok: true,
      summary: `${params.label ?? targetScript}: known-bad fixture was rejected with status ${targetResult.status}.`,
      findings
    };
  }

  return {
    ok: false,
    summary: `${params.label ?? targetScript}: known-bad fixture unexpectedly returned ${targetResult.status}.`,
    findings
  };
}

emit(async () => {
  const inputs = readInputs();
  const params = paramsInput(inputs);
  const results = await Promise.all(caseParams(params).map((testCase) => runCase(testCase, inputs)));
  const failed = results.filter((result) => !result.ok);
  const findings = { cases: results.map((result) => result.findings) };

  if (failed.length === 0) {
    return pass(`${params.label ?? "known-bad fixture"}: all ${results.length} known-bad fixture(s) were rejected.`, { findings });
  }

  return fail(`${params.label ?? "known-bad fixture"}: ${failed.length}/${results.length} known-bad fixture(s) were not rejected.`, { findings });
});
