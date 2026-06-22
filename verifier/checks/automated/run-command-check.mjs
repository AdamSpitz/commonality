import path from "node:path";
import { access } from "node:fs/promises";
import { emit, readInputs, errorResult } from "../lib/result.mjs";
import { runCommand } from "../lib/run-command.mjs";

function mergedParams(inputs) {
  return Object.assign({}, ...inputs.filter((input) => input.kind === "params").map((input) => input.data ?? {}));
}

emit(async () => {
  const params = mergedParams(readInputs());
  const command = params.command;
  if (!Array.isArray(command) || command.length === 0 || command.some((part) => typeof part !== "string")) {
    return errorResult("Automated command check is missing a params.command string array.", { findings: { params } });
  }

  const workspace = process.env.VERIFIER_WORKSPACE ?? process.cwd();
  const cwd = params.cwd ? path.resolve(workspace, params.cwd) : path.resolve(workspace, "..");

  const requireExistingPaths = params.requireExistingPaths ?? [];
  if (!Array.isArray(requireExistingPaths) || requireExistingPaths.some((part) => typeof part !== "string")) {
    return errorResult("Automated command check params.requireExistingPaths must be a string array when provided.", { findings: { params } });
  }
  const missingPaths = [];
  for (const relativePath of requireExistingPaths) {
    try {
      await access(path.resolve(cwd, relativePath));
    } catch {
      missingPaths.push(relativePath);
    }
  }
  if (missingPaths.length > 0) {
    return errorResult(`Automated command check references ${missingPaths.length} missing path${missingPaths.length === 1 ? "" : "s"}.`, {
      findings: { cwd, missingPaths, command },
    });
  }

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
