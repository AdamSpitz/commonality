import path from "node:path";
import { emit, errorResult, fail, pass, readInputs, truncate, writeTextArtifact } from "../lib/result.mjs";
import { runCommand } from "../lib/run-command.mjs";

// Routine AI-service verification runs against deterministic fixture/mock-LLM
// harnesses only — never live models. Each suite mocks the model client, so a
// regression here is a real product bug (prompt construction, untrusted-data
// wrapping, schema/confidence normalization, publication shape), not flakiness
// or a network outage. Live-model checks, if ever added, must be a separate
// explicitly opted-in check; this one stays cheap and offline.

function mergedParams(inputs) {
  return Object.assign({}, ...inputs.filter((input) => input.kind === "params").map((input) => input.data ?? {}));
}

emit(async () => {
  const params = mergedParams(readInputs());
  const suites = params.suites;
  if (!Array.isArray(suites) || suites.length === 0) {
    return errorResult("ai-fixtures.deterministic is missing a params.suites array.", { findings: { params } });
  }

  const workspace = process.env.VERIFIER_WORKSPACE ?? process.cwd();
  // Defensively blank any live-model credentials so a stray non-mocked call
  // fails loudly instead of silently reaching a real provider.
  const offlineEnv = { OPENROUTER_API_KEY: "", OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" };

  const results = [];
  for (const suite of suites) {
    const command = suite.command;
    if (!Array.isArray(command) || command.length === 0 || command.some((part) => typeof part !== "string")) {
      return errorResult(`ai-fixtures suite "${suite.label ?? "?"}" has an invalid command.`, { findings: { suite } });
    }
    const cwd = suite.cwd ? path.resolve(workspace, suite.cwd) : path.resolve(workspace, "..");
    const [program, ...args] = command;
    const result = await runCommand(program, args, {
      cwd,
      timeoutMs: suite.commandTimeoutMs ?? params.commandTimeoutMs ?? 120000,
      label: suite.label ?? command.join(" "),
      env: { ...offlineEnv, ...(suite.env ?? {}) },
      artifactOutputLimit: 0,
      findingOutputLimit: params.findingOutputLimit ?? 2000
    });
    results.push({ label: suite.label ?? command.join(" "), ...result });
  }

  const failed = results.filter((r) => r.status === "fail");
  const errored = results.filter((r) => r.status === "error");

  const transcript = results
    .map((r) => `### ${r.label} — ${r.status}\n${truncate(r.findings?.stdoutTail ?? "", 4000)}\n${truncate(r.findings?.stderrTail ?? "", 2000)}`)
    .join("\n\n");
  const artifacts = [await writeTextArtifact("ai-fixtures.log", transcript, "text/plain", "Combined AI-service fixture suite output")];

  const findings = {
    suites: results.map((r) => ({ label: r.label, status: r.status, summary: r.summary, exitCode: r.findings?.exitCode ?? null })),
    policy: "Deterministic mock-LLM fixture suites only; live-model credentials are blanked for the run."
  };

  if (errored.length > 0 && failed.length === 0) {
    return errorResult(`AI-service fixture harness could not run ${errored.length}/${results.length} suite(s).`, { findings, artifacts });
  }
  if (failed.length > 0) {
    return fail(`AI-service fixture harness: ${failed.length}/${results.length} suite(s) failed (${failed.map((r) => r.label).join(", ")}).`, { findings, artifacts });
  }
  return pass(`AI-service fixture harness: all ${results.length} mock-LLM suite(s) passed.`, { findings, artifacts });
});
