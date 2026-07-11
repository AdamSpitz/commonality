import { spawn } from "node:child_process";
import { emit, fail, pass, truncate, workspacePath } from "../lib/result.mjs";

// Verifier-of-verifier fixture for meta.report-currency. Proves the deterministic
// contract around the LLM judgment: the structured invalidation list (not the
// model's self-reported status) decides the verdict, malformed output is rejected
// as an error, and the free fast path returns "current" with no model call when no
// commits have landed. Git is stubbed via the COMMITS override env var so the test
// is hermetic and does not depend on the repo's real history.

function currencyResponse({ status = "pass", summary, invalidatedChecks }) {
  return JSON.stringify({
    status,
    summary,
    invalidatedChecks,
    reportMarkdown: "## Verdict\nfixture\n## Commits considered\nfixture\n## Checks to re-run (with why)\nfixture\n## Checks still current\nfixture"
  });
}

const ONE_COMMIT = JSON.stringify([{ sha: "deadbeefcafe0001", subject: "Rework indexer fold logic", stat: " sdk/src/fold.ts | 40 +++--" }]);

const CASES = [
  {
    label: "commits that invalidate a check map to uncertain even when model self-reports pass",
    env: {
      COMMONALITY_VERIFIER_REPORT_CURRENCY_COMMITS: ONE_COMMIT,
      COMMONALITY_VERIFIER_REPORT_CURRENCY_FIXTURE_RESPONSE: currencyResponse({
        status: "pass",
        summary: "fixture says pass but lists an invalidated check",
        invalidatedChecks: [{ checkId: "automated.indexer-integrity-canaries", severity: "high", reason: "fold logic changed" }]
      })
    },
    expectedStatus: "uncertain"
  },
  {
    label: "commits that invalidate nothing map to pass (report still current)",
    env: {
      COMMONALITY_VERIFIER_REPORT_CURRENCY_COMMITS: ONE_COMMIT,
      COMMONALITY_VERIFIER_REPORT_CURRENCY_FIXTURE_RESPONSE: currencyResponse({
        status: "uncertain",
        summary: "fixture says uncertain but lists nothing",
        invalidatedChecks: []
      })
    },
    expectedStatus: "pass"
  },
  {
    label: "malformed judgment output is rejected as a check error",
    env: {
      COMMONALITY_VERIFIER_REPORT_CURRENCY_COMMITS: ONE_COMMIT,
      COMMONALITY_VERIFIER_REPORT_CURRENCY_FIXTURE_RESPONSE: JSON.stringify({
        status: "pass",
        summary: "missing reportMarkdown",
        invalidatedChecks: []
      })
    },
    expectedStatus: "error"
  },
  {
    label: "no commits since the watermark returns current with no model call (free fast path)",
    env: {
      COMMONALITY_VERIFIER_REPORT_CURRENCY_COMMITS: "[]",
      // A clean prior watermark with no invalidations, so the fast path is hermetic.
      COMMONALITY_VERIFIER_REPORT_CURRENCY_PREV: JSON.stringify({ findings: { watermarkCommit: "0000000000000000", invalidatedChecks: [] } }),
      // Deliberately no fixture response: if the fast path tried to call the model
      // it would hang/fail rather than silently pass.
      COMMONALITY_VERIFIER_REPORT_CURRENCY_HEAD: "0000000000000000"
    },
    expectedStatus: "pass"
  }
];

function runReportCurrency(env) {
  return new Promise((resolve) => {
    const child = spawn("node", ["checks/meta/report-currency.mjs"], {
      cwd: workspacePath(),
      env: {
        ...process.env,
        VERIFIER_WORKSPACE: workspacePath(),
        VERIFIER_INPUTS: JSON.stringify([{ kind: "params", data: { model: "fixture-model" } }]),
        VERIFIER_CHECK_ID: "known-bad-target:report-currency",
        ...env
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
  const run = await runReportCurrency(testCase.env);
  const result = parseResult(run, testCase.label);
  return {
    ok: result.status === testCase.expectedStatus,
    label: testCase.label,
    expectedStatus: testCase.expectedStatus,
    targetStatus: result.status,
    targetSummary: result.summary,
    modelCalled: result.findings?.modelCalled ?? null,
    targetExitCode: run.exitCode,
    targetStderr: truncate(run.stderr)
  };
}

emit(async () => {
  const results = [];
  for (const testCase of CASES) {
    results.push(await runCase(testCase));
  }
  const failed = results.filter((result) => !result.ok);
  const findings = { cases: results };
  if (failed.length === 0) {
    return pass("Report-currency fixtures: invalidation list drives the verdict, malformed output errors, and the no-commit fast path stays model-free.", { findings });
  }
  return fail(`Report-currency regression: ${failed.length}/${results.length} case(s) wrong.`, { findings });
});
