import { spawn } from "node:child_process";
import { emit, fail, pass, truncate, workspacePath } from "../lib/result.mjs";

const REVIEW_HIGH = JSON.stringify({
  status: "pass",
  summary: "High recommendation fixture",
  materialRecommendations: [{ title: "Gap", severity: "high", evidence: ["fixture"], recommendation: "Fix it" }],
  reportMarkdown: "## Scope reviewed\nfixture\n## Main findings\nhigh\n## Suggested next checks\nnone\n## Skipped/uncertain scope\nnone"
});

const REVIEW_LOW = JSON.stringify({
  status: "uncertain",
  summary: "Low recommendation fixture",
  materialRecommendations: [{ title: "Polish", severity: "low", evidence: ["fixture"], recommendation: "Maybe polish" }],
  reportMarkdown: "## Scope reviewed\nfixture\n## Main findings\nlow\n## Suggested next checks\nnone\n## Skipped/uncertain scope\nnone"
});

const AUTO_SIGNIFICANT = JSON.stringify({
  status: "pass",
  summary: "Significant candidate fixture",
  candidates: [{ checkId: "review.fixture", promotability: "partial", priority: "significant", mechanizableCriterion: "fixture criterion", proposedTest: "fixture test", effort: "low", evidence: ["fixture"] }],
  keepSubjective: [],
  reportMarkdown: "## Scope reviewed\nfixture\n## Promotion candidates\none\n## Keep subjective\nnone\n## Skipped/uncertain scope\nnone"
});

const AUTO_NICE = JSON.stringify({
  status: "uncertain",
  summary: "Nice-to-have candidate fixture",
  candidates: [{ checkId: "review.fixture", promotability: "support-only", priority: "nice-to-have", mechanizableCriterion: "fixture criterion", proposedTest: "fixture test", effort: "low", evidence: ["fixture"] }],
  keepSubjective: [],
  reportMarkdown: "## Scope reviewed\nfixture\n## Promotion candidates\none\n## Keep subjective\nnone\n## Skipped/uncertain scope\nnone"
});

function runNode(script, { env = {}, inputs = [] } = {}) {
  return new Promise((resolve) => {
    const child = spawn("node", [script], {
      cwd: workspacePath(),
      env: {
        ...process.env,
        VERIFIER_WORKSPACE: workspacePath(),
        VERIFIER_INPUTS: JSON.stringify(inputs),
        VERIFIER_CHECK_ID: `known-bad-target:${script}`,
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

async function runLeaf(script, fixtureEnvVar, fixtureResponse) {
  const run = await runNode(script, {
    env: { [fixtureEnvVar]: fixtureResponse },
    inputs: [{ kind: "params", data: { model: "fixture-model" } }]
  });
  return parseResult(run, script);
}

async function runVerifierHealth(id, result) {
  const run = await runNode("checks/meta/verifier-health.mjs", {
    inputs: [{ kind: "check", id, role: "verifier-review", result }]
  });
  return parseResult(run, "meta.verifier-health");
}

async function runCase(testCase) {
  const leaf = await runLeaf(testCase.script, testCase.fixtureEnvVar, testCase.fixtureResponse);
  const health = await runVerifierHealth(testCase.id, leaf);
  const ok = health.status === testCase.expectedHealthStatus;
  return {
    ok,
    label: testCase.label,
    expectedHealthStatus: testCase.expectedHealthStatus,
    leafStatus: leaf.status,
    leafSummary: leaf.summary,
    leafFindings: leaf.findings,
    healthStatus: health.status,
    healthSummary: health.summary,
    healthFindings: health.findings
  };
}

emit(async () => {
  const cases = [
    { label: "high verifier recommendation blocks", id: "meta.llm-check-review", script: "checks/meta/llm-check-review.mjs", fixtureEnvVar: "COMMONALITY_VERIFIER_LLM_REVIEW_FIXTURE_RESPONSE", fixtureResponse: REVIEW_HIGH, expectedHealthStatus: "uncertain" },
    { label: "low verifier recommendation stays non-gating", id: "meta.llm-check-review", script: "checks/meta/llm-check-review.mjs", fixtureEnvVar: "COMMONALITY_VERIFIER_LLM_REVIEW_FIXTURE_RESPONSE", fixtureResponse: REVIEW_LOW, expectedHealthStatus: "pass" },
    { label: "significant automation candidate blocks", id: "meta.llm-to-automated-candidates", script: "checks/meta/llm-to-automated-candidates.mjs", fixtureEnvVar: "COMMONALITY_VERIFIER_LLM_TO_AUTOMATED_FIXTURE_RESPONSE", fixtureResponse: AUTO_SIGNIFICANT, expectedHealthStatus: "uncertain" },
    { label: "nice-to-have automation candidate stays non-gating", id: "meta.llm-to-automated-candidates", script: "checks/meta/llm-to-automated-candidates.mjs", fixtureEnvVar: "COMMONALITY_VERIFIER_LLM_TO_AUTOMATED_FIXTURE_RESPONSE", fixtureResponse: AUTO_NICE, expectedHealthStatus: "pass" }
  ];
  const results = await Promise.all(cases.map(runCase));
  const failed = results.filter((result) => !result.ok);
  const findings = { cases: results };
  if (failed.length === 0) {
    return pass("meta verifier-health significance threshold fixtures behaved as expected.", { findings });
  }
  return fail(`meta verifier-health significance threshold regression: ${failed.length}/${results.length} case(s) wrong.`, { findings });
});
