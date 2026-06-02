import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { emit, fail, pass, readInputs, workspacePath } from "../lib/result.mjs";

const VALID_SEVERITIES = new Set(["blocker", "high", "medium", "low", "info"]);
const VALID_STATUSES = new Set(["open", "in-progress", "deferred", "accepted-risk", "closed"]);
const DEFAULT_REVIEW_AFTER_DAYS = { blocker: 14, high: 30, medium: 90, low: 90, info: 180 };

function findFileInput(inputs, inputName) {
  return inputs.find((input) => input.kind === "file" && (input.as === inputName || input.path?.endsWith(inputName)));
}

function parseInventory(input) {
  if (!input) throw new Error("Missing testing-plan inventory file input.");
  if (input.content === null || input.content === undefined) throw new Error(`Could not read inventory file: ${input.path}`);
  const inventory = JSON.parse(input.content);
  if (!Array.isArray(inventory.items)) throw new Error("Inventory must contain an items array.");
  return inventory;
}

async function collectCheckIds(dir) {
  const ids = new Set();

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
      if (typeof def.id === "string") ids.add(def.id);
    }));
  }

  await visit(dir);
  return ids;
}

function daysSince(dateText, now) {
  const time = Date.parse(`${dateText}T00:00:00Z`);
  if (Number.isNaN(time)) return null;
  return Math.floor((now - time) / (24 * 60 * 60 * 1000));
}

function problem(severity, title, evidence, recommendation, item) {
  return {
    severity,
    confidence: "high",
    area: "verifier-known-gaps",
    title,
    evidence,
    recommendation,
    itemId: item.id
  };
}

function validateGap(item, knownCheckIds, now) {
  const findings = [];
  const label = item.id ?? item.title ?? "known-gap item";

  if (typeof item.owner !== "string" || item.owner.trim() === "") {
    findings.push(problem("high", `${label} has no owner`, ["owner is missing or blank"], "Assign an accountable owner for this known gap.", item));
  }
  if (typeof item.status !== "string" || item.status.trim() === "") {
    findings.push(problem("high", `${label} has no status`, ["status is missing or blank"], "Record whether the gap is open, in-progress, deferred, accepted-risk, or closed.", item));
  } else if (!VALID_STATUSES.has(item.status)) {
    findings.push(problem("medium", `${label} has invalid status`, [`status=${item.status}`], `Use one of: ${[...VALID_STATUSES].join(", ")}.`, item));
  }
  if (!VALID_SEVERITIES.has(item.severity)) {
    findings.push(problem("high", `${label} has no valid severity`, [`severity=${item.severity ?? "missing"}`], `Use one of: ${[...VALID_SEVERITIES].join(", ")}.`, item));
  }
  if (typeof item.nextAction !== "string" || item.nextAction.trim() === "") {
    findings.push(problem("medium", `${label} has no next action`, ["nextAction is missing or blank"], "Record the next concrete action for reducing or accepting this gap.", item));
  }
  if (typeof item.targetConfidence !== "string" || item.targetConfidence.trim() === "") {
    findings.push(problem("low", `${label} has no target confidence`, ["targetConfidence is missing or blank"], "Record the validation confidence target this gap should eventually support.", item));
  }

  const ageDays = daysSince(item.lastReviewed, now);
  if (ageDays === null) {
    findings.push(problem("high", `${label} has no parseable lastReviewed date`, [`lastReviewed=${item.lastReviewed ?? "missing"}`], "Set lastReviewed to YYYY-MM-DD whenever the gap is triaged.", item));
  } else {
    const reviewAfterDays = Number(item.reviewAfterDays ?? DEFAULT_REVIEW_AFTER_DAYS[item.severity] ?? 90);
    if (!Number.isFinite(reviewAfterDays) || reviewAfterDays <= 0) {
      findings.push(problem("medium", `${label} has invalid reviewAfterDays`, [`reviewAfterDays=${item.reviewAfterDays}`], "Use a positive number of days.", item));
    } else if (ageDays > reviewAfterDays && item.status !== "closed") {
      findings.push(problem(
        item.severity === "blocker" || item.severity === "high" ? "high" : "medium",
        `${label} known-gap review is stale`,
        [`lastReviewed=${item.lastReviewed}`, `ageDays=${ageDays}`, `reviewAfterDays=${reviewAfterDays}`],
        "Re-triage the gap, update lastReviewed, and either close it or record a current nextAction.",
        item
      ));
    }
  }

  for (const checkId of item.checkIds ?? []) {
    if (!knownCheckIds.has(checkId)) {
      findings.push(problem("high", `${label} references nonexistent check ${checkId}`, [`checkIds includes ${checkId}`], "Remove the stale reference or add the missing check definition.", item));
    }
  }

  return findings;
}

emit(async () => {
  const inventory = parseInventory(findFileInput(readInputs(), "testingPlanItems"));
  const knownCheckIds = await collectCheckIds(workspacePath("checks"));
  const knownGaps = inventory.items.filter((item) => item.coverage === "known-gap");
  const findings = knownGaps.flatMap((item) => validateGap(item, knownCheckIds, Date.now()));

  const gapSummaries = knownGaps.map((item) => ({
    id: item.id,
    title: item.title,
    owner: item.owner,
    severity: item.severity,
    status: item.status,
    lastReviewed: item.lastReviewed,
    reviewAfterDays: item.reviewAfterDays ?? DEFAULT_REVIEW_AFTER_DAYS[item.severity] ?? 90,
    nextAction: item.nextAction,
    targetConfidence: item.targetConfidence,
    checkIds: item.checkIds ?? []
  }));

  const resultFindings = {
    source: inventory.source,
    knownGapCount: knownGaps.length,
    gaps: gapSummaries,
    problems: findings
  };

  if (knownGaps.length === 0) {
    return fail("No known-gap items found in testing-plan inventory; verifier cannot track deferred risk.", { findings: resultFindings });
  }
  if (findings.length > 0) {
    return fail(`Known-gap inventory has ${findings.length} stale or incomplete metadata problem(s).`, { findings: resultFindings });
  }
  return pass(`Known-gap inventory is current for ${knownGaps.length} gap(s).`, { findings: resultFindings });
});
