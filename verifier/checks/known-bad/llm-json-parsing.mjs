import { spawn } from "node:child_process";
import { emit, fail, pass, truncate, workspacePath } from "../lib/result.mjs";

function validResponse(summary) {
  return JSON.stringify({
    status: "pass",
    summary,
    materialRecommendations: [],
    reportMarkdown: "## Scope reviewed\nfixture\n## Main findings\nnone\n## Suggested next checks\nnone\n## Skipped/uncertain scope\nnone"
  });
}

const CASES = [
  {
    label: "fenced prose response is extracted",
    fixture: `Here is the result:\n\n\`\`\`json\n${validResponse("fenced ok")}\n\`\`\``,
    expectedStatus: "pass"
  },
  {
    label: "first malformed object then valid object is extracted",
    fixture: `draft {not json}\nfinal ${validResponse("second object ok")}`,
    expectedStatus: "pass"
  },
  {
    label: "raw control characters inside JSON strings are escaped before parsing",
    fixture: '{"status":"pass","summary":"raw newline ok","materialRecommendations":[],"reportMarkdown":"## Scope reviewed\\nfixture\\n## Main findings\\nraw\nnewline\\n## Suggested next checks\\nnone\\n## Skipped/uncertain scope\\nnone"}',
    expectedStatus: "pass"
  },
  {
    label: "malformed result shape is rejected as check error",
    fixture: JSON.stringify({ status: "pass", summary: "missing report" }),
    expectedStatus: "error"
  },
  {
    label: "non-json prose is rejected as check error",
    fixture: "I refuse to emit JSON today.",
    expectedStatus: "error"
  }
];

function runLeaf(fixture) {
  return new Promise((resolve) => {
    const child = spawn("node", ["checks/meta/llm-check-review.mjs"], {
      cwd: workspacePath(),
      env: {
        ...process.env,
        VERIFIER_WORKSPACE: workspacePath(),
        VERIFIER_INPUTS: JSON.stringify([{ kind: "params", data: { model: "fixture-model" } }]),
        VERIFIER_CHECK_ID: "known-bad-target:llm-json-parsing",
        COMMONALITY_VERIFIER_LLM_REVIEW_FIXTURE_RESPONSE: fixture
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

function parseResult(run, label) {
  if (run.error) throw new Error(`${label} failed to launch: ${run.error.message}`);
  const lines = run.stdout.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length !== 1) throw new Error(`${label} emitted ${lines.length} stdout line(s), expected one. stderr: ${truncate(run.stderr)}`);
  return JSON.parse(lines[0]);
}

async function runCase(testCase) {
  const run = await runLeaf(testCase.fixture);
  const result = parseResult(run, testCase.label);
  return {
    ok: result.status === testCase.expectedStatus,
    label: testCase.label,
    expectedStatus: testCase.expectedStatus,
    targetStatus: result.status,
    targetSummary: result.summary,
    targetFindings: result.findings,
    targetExitCode: run.exitCode,
    targetStderr: truncate(run.stderr)
  };
}

emit(async () => {
  const results = await Promise.all(CASES.map(runCase));
  const failed = results.filter((result) => !result.ok);
  const findings = { cases: results };
  if (failed.length === 0) {
    return pass("LLM judgment actual check path parses or rejects JSON fixtures as expected.", { findings });
  }
  return fail(`LLM judgment JSON parsing regression: ${failed.length}/${results.length} case(s) wrong.`, { findings });
});
