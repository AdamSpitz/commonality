import { spawn } from "node:child_process";
import { emit, fail, pass, truncate, workspacePath } from "../lib/result.mjs";

function docsResponse({ status = "pass", summary, findings }) {
  return JSON.stringify({
    status,
    summary,
    findings,
    reportMarkdown: "## Scope reviewed\nfixture\n## Main findings\nfixture\n## Suggested fixes\nfixture\n## Skipped/uncertain scope\nnone"
  });
}

const CASES = [
  {
    label: "high-severity docs finding gates red even when model says pass",
    fixture: docsResponse({
      status: "pass",
      summary: "High broken-instruction fixture",
      findings: [{
        title: "Documented command cannot work",
        severity: "high",
        kind: "unfollowable",
        evidence: ["fixture docs say to run a missing command"],
        recommendation: "Fix or remove the broken command."
      }]
    }),
    expectedStatus: "fail"
  },
  {
    label: "medium-severity docs finding gates yellow",
    fixture: docsResponse({
      status: "pass",
      summary: "Medium stale-doc fixture",
      findings: [{
        title: "Two docs use different names for one service",
        severity: "medium",
        kind: "stale",
        evidence: ["fixture docs disagree on service name"],
        recommendation: "Use one service name everywhere."
      }]
    }),
    expectedStatus: "uncertain"
  },
  {
    label: "model uncertainty alone cannot create a finding-free warning",
    fixture: docsResponse({
      status: "uncertain",
      summary: "No structured findings fixture",
      findings: []
    }),
    expectedStatus: "pass"
  },
  {
    label: "malformed findings shape is rejected as check error",
    fixture: JSON.stringify({
      status: "pass",
      summary: "Malformed findings fixture",
      findings: { severity: "high", title: "not an array" },
      reportMarkdown: "## Scope reviewed\nfixture\n## Main findings\nmalformed\n## Suggested fixes\nfixture\n## Skipped/uncertain scope\nnone"
    }),
    expectedStatus: "error"
  }
];

function runDocsCoherenceLeaf(fixture) {
  return new Promise((resolve) => {
    const child = spawn("node", ["checks/review/docs-coherence.mjs"], {
      cwd: workspacePath(),
      env: {
        ...process.env,
        VERIFIER_WORKSPACE: workspacePath(),
        VERIFIER_INPUTS: JSON.stringify([{ kind: "params", data: { model: "fixture-model", inputFiles: [] } }]),
        VERIFIER_CHECK_ID: "known-bad-target:llm-judgment-gating",
        COMMONALITY_VERIFIER_DOCS_COHERENCE_FIXTURE_RESPONSE: fixture
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
  const run = await runDocsCoherenceLeaf(testCase.fixture);
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
    return pass("LLM judgment gating fixtures mapped structured docs findings to the expected statuses.", { findings });
  }
  return fail(`LLM judgment gating regression: ${failed.length}/${results.length} case(s) wrong.`, { findings });
});
