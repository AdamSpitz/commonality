import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { emit, fail, pass, workspacePath } from "../lib/result.mjs";
import { evidenceText, loadParkedFailures, matchingPark, parkProblem, todayUtc } from "../lib/parked-failures.mjs";

async function checkIds() {
  const ids = new Set();
  async function visit(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(full);
      else if (entry.name.endsWith(".def.json")) {
        const def = JSON.parse(await readFile(full, "utf8"));
        if (def.id) ids.add(def.id);
      }
    }
  }
  await visit(workspacePath("checks"));
  return ids;
}

async function latestResult(checkId) {
  const dir = workspacePath("results", checkId);
  let names;
  try {
    names = await readdir(dir);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  const latest = names.filter((name) => name.endsWith(".json") && !name.includes(".tmp-")).sort().at(-1);
  return latest ? JSON.parse(await readFile(path.join(dir, latest), "utf8")) : null;
}

emit(async () => {
  const items = await loadParkedFailures();
  const ids = await checkIds();
  const problems = [];
  const parked = [];
  for (const item of items) {
    const problem = parkProblem(item);
    if (problem) {
      problems.push(`${item?.checkId ?? "(missing id)"}: ${problem}`);
      continue;
    }
    if (!ids.has(item.checkId)) {
      problems.push(`${item.checkId}: no check definition`);
      continue;
    }
    const result = await latestResult(item.checkId);
    if (todayUtc() > item.reviewAfter) {
      problems.push(`${item.checkId}: park expired on ${item.reviewAfter}; decide or renew it`);
      continue;
    }
    if (matchingPark([item], item.checkId, result)) {
      parked.push({ checkId: item.checkId, reviewAfter: item.reviewAfter, reason: item.reason });
      continue;
    }
    if (result?.status === "pass") {
      problems.push(`${item.checkId}: now passes; remove the obsolete park`);
    } else if (!result) {
      problems.push(`${item.checkId}: no result to match the parked failure`);
    } else {
      problems.push(`${item.checkId}: latest ${result.status} no longer matches the parked evidence (${JSON.stringify(item.evidenceIncludes)}). Current evidence: ${evidenceText(result).slice(0, 240)}`);
    }
  }

  if (problems.length > 0) {
    return fail(`Parked-failure record needs attention: ${problems.join("; ")}`, { findings: { problems, parked } });
  }
  if (parked.length === 0) return pass("No failures are parked.", { findings: { parked } });
  return pass(`${parked.length} known failure(s) parked until their review dates.`, { findings: { parked } });
});
