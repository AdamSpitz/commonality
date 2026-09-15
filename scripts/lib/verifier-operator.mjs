import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export function pathMatches(changedPath, prefix) {
  return changedPath === prefix || changedPath.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`) || changedPath.startsWith(prefix);
}

export function affectedChecks(changedPaths, rules) {
  const checks = new Set();
  const mapped = new Set();
  for (const rule of rules) {
    for (const changedPath of changedPaths) {
      if ((rule.paths ?? []).some((prefix) => pathMatches(changedPath, prefix))) {
        mapped.add(changedPath);
        for (const check of rule.checks ?? []) checks.add(check);
      }
    }
  }
  return { checks: [...checks].sort(), unmapped: changedPaths.filter((file) => !mapped.has(file)).sort() };
}

export function profileFor(checkId, def, policy) {
  const override = policy.checkOverrides?.[checkId] ?? {};
  let key = override.cost;
  if (!key && def?.cost === "llm") key = "llm";
  if (!key) key = policy.defaultCosts?.find((entry) => checkId.startsWith(entry.idPrefix))?.cost;
  key ??= "minutes";
  const { label: _checkLabel, cost: _cost, ...profileOverride } = override;
  return { key, ...(policy.costProfiles[key] ?? {}), ...profileOverride };
}

export function summarizeProfiles(rows) {
  const seconds = rows.reduce((sum, row) => sum + (row.profile.observedSeconds ?? row.profile.estimatedSeconds ?? 0), 0);
  const effects = [...new Set(rows.flatMap((row) => row.profile.effects ?? []))];
  const requires = [...new Set(rows.flatMap((row) => row.profile.requires ?? []))];
  const llmCount = rows.filter((row) => row.profile.tokens && row.profile.tokens !== "none").length;
  return { seconds, effects, requires, llmCount };
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "unknown time";
  if (seconds < 60) return `about ${Math.max(1, Math.round(seconds))}s`;
  return `about ${Math.ceil(seconds / 60)}m`;
}

export async function fingerprintFiles(repoRoot, files) {
  const hash = createHash("sha256");
  for (const file of [...files].sort()) {
    hash.update(file);
    try {
      hash.update(await fs.readFile(path.join(repoRoot, file)));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      hash.update("<deleted>");
    }
  }
  return hash.digest("hex");
}
