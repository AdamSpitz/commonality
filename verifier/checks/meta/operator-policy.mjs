import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { emit, fail, pass, workspacePath } from "../lib/result.mjs";

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

async function main() {
  const policy = JSON.parse(await readFile(workspacePath("operator-policy.json"), "utf8"));
  const ids = new Set();
  for (const file of (await walk(workspacePath("checks"))).filter((name) => name.endsWith(".def.json"))) {
    const def = JSON.parse(await readFile(file, "utf8"));
    if (def.id) ids.add(def.id);
  }
  const references = [
    ...(policy.focus?.checks ?? []),
    ...(policy.conclusions ?? []).map((item) => item.id),
    ...Object.keys(policy.checkOverrides ?? {}),
    ...(policy.changeRules ?? []).flatMap((rule) => rule.checks ?? []),
    ...Object.values(policy.milestones ?? {}).flatMap((milestone) => milestone.checks ?? []),
    ...Object.values(policy.milestones ?? {}).flatMap((milestone) => (milestone.steps ?? []).flatMap((step) => step.command?.[0] === "verifier-run" ? [step.command[1]] : [])),
  ];
  const unknownChecks = [...new Set(references.filter((id) => !ids.has(id)))].sort();
  const costs = new Set(Object.keys(policy.costProfiles ?? {}));
  const referencedCosts = [
    ...Object.values(policy.checkOverrides ?? {}).map((item) => item.cost),
    ...(policy.defaultCosts ?? []).map((item) => item.cost),
  ].filter(Boolean);
  const unknownCosts = [...new Set(referencedCosts.filter((cost) => !costs.has(cost)))].sort();
  const emptyRules = (policy.changeRules ?? []).filter((rule) => !(rule.paths?.length && rule.checks?.length));
  const invalidSteps = Object.values(policy.milestones ?? {}).flatMap((milestone) => milestone.steps ?? []).filter((step) => !step.label || !Array.isArray(step.command) || !step.command.length || !costs.has(step.cost));
  let focusSourceReadable = true;
  try { await readFile(workspacePath(policy.focus.source), "utf8"); } catch { focusSourceReadable = false; }
  const findings = { checkCount: ids.size, referencedCheckCount: new Set(references).size, unknownChecks, unknownCosts, emptyRuleCount: emptyRules.length, invalidStepCount: invalidSteps.length, focusSourceReadable };
  if (unknownChecks.length || unknownCosts.length || emptyRules.length || invalidSteps.length || !focusSourceReadable) return fail("Verifier operator policy contains invalid references.", { findings });
  return pass(`Verifier operator policy is consistent: ${new Set(references).size} referenced checks across ${policy.changeRules.length} change rules.`, { findings });
}

emit(main);
