import { readFile } from "node:fs/promises";
import path from "node:path";
import { emit, fail, pass } from "../lib/result.mjs";

const workspace = process.env.VERIFIER_WORKSPACE ?? process.cwd();

emit(async () => {
  // These files are too large to reliably pass through VERIFIER_INPUTS on some systems,
  // but they are still declared as file inputs in the definition so onInputChange works.
  const baseline = JSON.parse(await readFile(path.resolve(workspace, "security-baselines/package-lock-dependencies.json"), "utf8"));
  const lock = JSON.parse(await readFile(path.resolve(workspace, "../package-lock.json"), "utf8"));
  const baselinePackages = new Set(baseline.packages ?? []);
  const currentPackages = Object.keys(lock.packages ?? {}).filter((name) => name.startsWith("node_modules/") || name.includes("/node_modules/")).sort();
  const added = currentPackages.filter((name) => !baselinePackages.has(name));
  const removed = [...baselinePackages].filter((name) => !currentPackages.includes(name));
  const findings = { added, removed, baselineCount: baselinePackages.size, currentCount: currentPackages.length };
  if (added.length > 0) return fail(`${added.length} package-lock dependency package(s) added since security baseline review.`, { findings });
  return pass(`No new package-lock dependency packages since baseline (${currentPackages.length} current).`, { findings });
});
