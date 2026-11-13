import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { emit, fail, pass, readInputs, workspacePath } from "../lib/result.mjs";

const VALID_MILESTONES = new Set(["release-candidate", "full-launch"]);
const GUARDED_CHECK_IDS = [
  "artifact.ipfs-domain-smoke",
  "operations.indexer-lag",
  "stack.user-journeys",
  "stack.fresh-seeded",
  "stack.restart-consistency",
  "testnet.dns",
  "testnet.http",
  "testnet.rpc",
  "testnet.indexer",
  "testnet.app-shell",
  "testnet.app-config",
  "testnet.contracts",
  "testnet.onchain-to-indexer",
  "testnet.website-journeys"
];

function findFileInput(inputs, inputName) {
  return inputs.find((input) => input.kind === "file" && (input.as === inputName || input.path?.endsWith(inputName)));
}

function parsePolicy(input) {
  if (!input) throw new Error("Missing guarded-check policy file input.");
  if (input.content === null || input.content === undefined) throw new Error(`Could not read guarded-check policy file: ${input.path}`);
  const policy = JSON.parse(input.content);
  if (!Array.isArray(policy.items)) throw new Error("Guarded-check policy must contain an items array.");
  return policy;
}

async function collectDefs(dir) {
  const defs = new Map();

  async function visit(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    await Promise.all(entries.map(async (entry) => {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
        return;
      }
      if (!entry.name.endsWith(".def.json")) return;
      const def = JSON.parse(await readFile(entryPath, "utf8"));
      if (typeof def.id === "string") defs.set(def.id, { ...def, path: path.relative(workspacePath(), entryPath) });
    }));
  }

  await visit(dir);
  return defs;
}

function paramsInputs(def) {
  return (def.inputs ?? []).filter((input) => input.kind === "params").map((input) => input.data ?? {});
}

function defMentionsEnv(def, envName) {
  const paramsText = JSON.stringify(paramsInputs(def));
  return paramsText.includes(envName);
}

function validatePolicyItem(item, index, defs) {
  const problems = [];
  const label = item?.checkId ?? `item at index ${index}`;
  const def = typeof item?.checkId === "string" ? defs.get(item.checkId) : null;

  if (!item || typeof item !== "object") return [`Guarded-check policy item at index ${index} is not an object.`];
  if (typeof item.checkId !== "string" || item.checkId.length === 0) problems.push(`${label}: missing checkId.`);
  if (!VALID_MILESTONES.has(item.mandatoryBy)) problems.push(`${label}: mandatoryBy must be one of ${[...VALID_MILESTONES].join(", ")}.`);
  if (!Number.isFinite(Number(item.maxAgeDays)) || Number(item.maxAgeDays) <= 0) problems.push(`${label}: maxAgeDays must be a positive number.`);
  if (!Array.isArray(item.optInEnv) || item.optInEnv.length === 0 || item.optInEnv.some((name) => typeof name !== "string" || name.length === 0)) {
    problems.push(`${label}: optInEnv must list at least one environment variable.`);
  }
  if (typeof item.skipPolicyBeforeMandatory !== "string" || item.skipPolicyBeforeMandatory.length === 0) {
    problems.push(`${label}: skipPolicyBeforeMandatory must explain why skipped-by-policy is acceptable before the mandatory milestone.`);
  }

  if (!def) {
    problems.push(`${label}: references nonexistent verifier check.`);
    return problems;
  }

  if (def.trigger?.type !== "manual") problems.push(`${label}: guarded/deep checks must be manual-triggered, not '${def.trigger?.type ?? "missing"}'.`);
  if (!Array.isArray(def.command) || def.command.length === 0) problems.push(`${label}: check definition must have a command array.`);

  for (const envName of item.optInEnv ?? []) {
    if (typeof envName === "string" && !defMentionsEnv(def, envName)) {
      problems.push(`${label}: definition does not mention opt-in env var '${envName}' in params; policy may have drifted from the guard implementation.`);
    }
  }

  return problems;
}

function validatePolicy(policy, defs) {
  const problems = [];
  const ids = new Set();

  policy.items.forEach((item, index) => {
    problems.push(...validatePolicyItem(item, index, defs));
    if (!item?.checkId) return;
    if (ids.has(item.checkId)) problems.push(`${item.checkId}: duplicate guarded-check policy item.`);
    ids.add(item.checkId);
  });

  for (const requiredId of GUARDED_CHECK_IDS) {
    if (!ids.has(requiredId)) problems.push(`Missing guarded-check policy for '${requiredId}'.`);
  }

  return problems;
}

emit(async () => {
  const inputs = readInputs();
  const policy = parsePolicy(findFileInput(inputs, "guardedCheckPolicy"));
  const defs = await collectDefs(workspacePath("checks"));
  const problems = validatePolicy(policy, defs);
  const findings = {
    source: policy.source,
    policy: policy.policy,
    requiredGuardedCheckIds: GUARDED_CHECK_IDS,
    items: policy.items.map((item) => ({
      checkId: item.checkId,
      mandatoryBy: item.mandatoryBy,
      maxAgeDays: item.maxAgeDays,
      optInEnv: item.optInEnv,
      skipPolicyBeforeMandatory: item.skipPolicyBeforeMandatory
    })),
    problems
  };

  if (problems.length > 0) {
    return fail(`Guarded-check policy has ${problems.length} problem(s).`, { findings });
  }

  return pass(`Guarded-check policy covers ${policy.items.length} guarded/deep check(s); all are mandatory by an explicit milestone.`, { findings });
});
