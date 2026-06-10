// Proves the root.report narrative generator rejects unusable model output
// (non-JSON prose, and JSON missing the required reportMarkdown) by THROWING,
// rather than returning a hollow report. root.mjs relies on this throw to degrade
// gracefully (keep its rollup status, flag the narrative failure) — so this
// fixture guards the contract that a flaky narrative model can never silently
// produce an empty/garbage report.

import { emit, fail, pass } from "../lib/result.mjs";
import { generateNarrative } from "../lib/narrative.mjs";

const FIXTURE_ENV = "COMMONALITY_VERIFIER_ROOT_REPORT_FIXTURE_RESPONSE";

const CASES = [
  { label: "non-JSON prose response", fixture: "Sorry, I cannot produce a report right now." },
  { label: "JSON missing reportMarkdown", fixture: '{"status":"pass","summary":"all good"}' }
];

const WORKERS = [
  { kind: "check", id: "facet.functionality", role: "facet", result: { status: "pass", summary: "ok" } }
];

async function runCase({ label, fixture }) {
  const previous = process.env[FIXTURE_ENV];
  process.env[FIXTURE_ENV] = fixture;
  try {
    const narrative = await generateNarrative(WORKERS, null, { model: "fixture-model" });
    return { label, ok: false, detail: `generator returned a result (status ${narrative.status}) instead of throwing` };
  } catch (error) {
    return { label, ok: true, detail: `rejected: ${error?.message ?? String(error)}` };
  } finally {
    if (previous === undefined) delete process.env[FIXTURE_ENV];
    else process.env[FIXTURE_ENV] = previous;
  }
}

emit(async () => {
  const results = [];
  for (const testCase of CASES) {
    results.push(await runCase(testCase));
  }
  const failed = results.filter((r) => !r.ok);
  const findings = { cases: results };
  if (failed.length === 0) {
    return pass(`root.report narrative generator rejected all ${results.length} malformed-output fixture(s).`, { findings });
  }
  return fail(`root.report narrative generator failed to reject ${failed.length}/${results.length} malformed-output fixture(s).`, { findings });
});
