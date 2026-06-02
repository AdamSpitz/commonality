import path from "node:path";
import { emit, readInputs, errorResult } from "../lib/result.mjs";
import { runCommand } from "../lib/run-command.mjs";

function mergedParams(inputs) {
  return Object.assign({}, ...inputs.filter((input) => input.kind === "params").map((input) => input.data ?? {}));
}

function missingRequiredEnv(requireEnv = []) {
  return requireEnv.filter((requirement) => {
    if (!requirement || typeof requirement.name !== "string") return true;
    const actual = process.env[requirement.name];
    if ("equals" in requirement) return actual !== String(requirement.equals);
    return !actual;
  });
}

emit(async () => {
  const params = mergedParams(readInputs());
  const missing = missingRequiredEnv(params.requireEnv);
  if (missing.length > 0) {
    return errorResult(`Refusing to run guarded command; missing required opt-in: ${missing.map((item) => item.name ?? "<invalid>").join(", ")}.`, {
      findings: { requireEnv: params.requireEnv, mutatesState: params.mutatesState }
    });
  }

  const command = params.command;
  if (!Array.isArray(command) || command.length === 0 || command.some((part) => typeof part !== "string")) {
    return errorResult("Guarded command check is missing a params.command string array.", { findings: { params } });
  }

  const workspace = process.env.VERIFIER_WORKSPACE ?? process.cwd();
  const cwd = params.cwd ? path.resolve(workspace, params.cwd) : path.resolve(workspace, "..");
  const [program, ...args] = command;
  return await runCommand(program, args, {
    cwd,
    timeoutMs: params.commandTimeoutMs ?? 120000,
    label: params.label ?? command.join(" "),
    env: params.env ?? {},
    artifactOutputLimit: params.artifactOutputLimit ?? 12000,
    findingOutputLimit: params.findingOutputLimit ?? 3000
  });
});
