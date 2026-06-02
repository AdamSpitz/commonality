import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { emit, fail, pass, uncertain, workspacePath } from "../lib/result.mjs";

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function stateTimestamp(state, keys) {
  for (const key of keys) {
    const value = state?.[key];
    if (!value) continue;
    const time = Date.parse(value);
    if (!Number.isNaN(time)) return time;
  }
  return null;
}

emit(async () => {
  const checksDir = process.env.VERIFIER_CHECKS ?? workspacePath("checks");
  const stateDir = process.env.VERIFIER_STATE ?? workspacePath("state");
  const defFiles = (await walk(checksDir)).filter((file) => file.endsWith(".def.json"));
  const now = Date.now();
  const graceMs = 10 * 60 * 1000;
  const findings = [];

  for (const defFile of defFiles) {
    const def = await readJson(defFile);
    if (!def.id || def.id === "meta.liveness") continue;

    const statePath = path.join(stateDir, `${def.id}.json`);
    let state = null;
    try {
      state = await readJson(statePath);
    } catch {
      findings.push({
        severity: "medium",
        confidence: "high",
        area: "verifier",
        title: `${def.id} has never recorded state`,
        evidence: [path.relative(process.env.VERIFIER_WORKSPACE ?? process.cwd(), defFile)],
        recommendation: `Run verifier-run --workspace verifier ${def.id}`
      });
      continue;
    }

    const nextRunAt = stateTimestamp(state, ["nextRunAt", "nextRun", "scheduledAt"]);
    if (nextRunAt !== null && nextRunAt + graceMs < now) {
      findings.push({
        severity: "high",
        confidence: "high",
        area: "verifier",
        title: `${def.id} is overdue`,
        evidence: [`nextRunAt=${new Date(nextRunAt).toISOString()}`],
        recommendation: `Investigate the scheduler or run verifier-run --workspace verifier ${def.id}`
      });
    }
  }

  if (defFiles.length === 0) {
    return uncertain("No verifier check definitions found.", { findings: { checksDir } });
  }

  if (findings.length > 0) {
    return fail(`${findings.length} verifier checks are silent or overdue.`, { findings });
  }

  return pass(`Verifier liveness OK for ${Math.max(0, defFiles.length - 1)} checks.`, {
    findings: { definitions: defFiles.length, ignoredSelf: "meta.liveness" }
  });
});
