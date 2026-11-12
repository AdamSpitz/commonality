import { readFile } from "node:fs/promises";
import { workspacePath } from "./result.mjs";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function todayUtc(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function evidenceText(result) {
  if (!result) return "";
  const findings = result.findings ?? {};
  return [
    result.summary ?? "",
    findings.stdoutTail ?? "",
    findings.stderrTail ?? ""
  ].join("\n");
}

export function parkProblem(item) {
  if (!item || typeof item !== "object") return "park entry is not an object";
  if (typeof item.checkId !== "string" || item.checkId.trim() === "") return "checkId is missing";
  if (typeof item.owner !== "string" || item.owner.trim() === "") return "owner is missing";
  if (typeof item.reason !== "string" || item.reason.trim() === "") return "reason is missing";
  if (!DATE.test(item.parkedOn ?? "")) return "parkedOn must be YYYY-MM-DD";
  if (!DATE.test(item.reviewAfter ?? "")) return "reviewAfter must be YYYY-MM-DD";
  if (item.reviewAfter < item.parkedOn) return "reviewAfter is before parkedOn";
  if (typeof item.evidenceIncludes !== "string" || item.evidenceIncludes.trim() === "") {
    return "evidenceIncludes is missing; a park must name the failure it covers";
  }
  return null;
}

export function matchingPark(items, checkId, result, now = new Date()) {
  const item = (items ?? []).find((candidate) => candidate?.checkId === checkId);
  if (!item || parkProblem(item)) return null;
  if (todayUtc(now) > item.reviewAfter) return null;
  if (result?.status !== "fail") return null;
  if (!evidenceText(result).includes(item.evidenceIncludes)) return null;
  return item;
}

export async function loadParkedFailures() {
  try {
    const parsed = JSON.parse(await readFile(workspacePath("parked-failures.json"), "utf8"));
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

export function splitParked(workers, items, now = new Date()) {
  const active = [];
  const parked = [];
  for (const worker of workers) {
    const park = matchingPark(items, worker.id, worker.result, now);
    if (park) parked.push({ ...worker, park });
    else active.push(worker);
  }
  return { active, parked };
}
