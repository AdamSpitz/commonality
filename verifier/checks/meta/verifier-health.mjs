import { emit, fail, pass, readInputs, uncertain } from "../lib/result.mjs";

function checkInputs(inputs) {
  return inputs.filter((input) => input.kind === "check");
}

function paramsInputs(inputs) {
  return inputs.filter((input) => input.kind === "params").map((input) => input.data ?? {});
}

function mergedParams(inputs) {
  return Object.assign({}, ...paramsInputs(inputs));
}

function statusOf(worker) {
  return worker.result?.status ?? "missing";
}

function statusCounts(workers) {
  return workers.reduce((acc, worker) => {
    const status = statusOf(worker);
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {});
}

function rollupCoreStatus(workers) {
  if (workers.some((worker) => statusOf(worker) === "fail")) return "fail";
  if (workers.some((worker) => ["missing", "error", "uncertain"].includes(statusOf(worker)))) return "uncertain";
  return "pass";
}

function childSummary(worker) {
  return {
    id: worker.id,
    role: worker.role,
    status: statusOf(worker),
    summary: worker.result?.summary ?? "No result yet"
  };
}

function makeSummary(status, coreWorkers, advisoryWorkers) {
  const coreCounts = statusCounts(coreWorkers);
  const advisoryCounts = statusCounts(advisoryWorkers);
  const coreParts = ["pass", "fail", "uncertain", "error", "missing"]
    .filter((statusName) => coreCounts[statusName])
    .map((statusName) => `${coreCounts[statusName]} ${statusName}`)
    .join(", ");
  const advisoryParts = ["pass", "fail", "uncertain", "error", "missing"]
    .filter((statusName) => advisoryCounts[statusName])
    .map((statusName) => `${advisoryCounts[statusName]} advisory ${statusName}`)
    .join(", ");
  return `meta.verifier-health: ${status} (${coreParts || "no core checks"}${advisoryParts ? `; ${advisoryParts}` : ""}).`;
}

emit(async () => {
  const inputs = readInputs();
  const params = mergedParams(inputs);
  const advisoryIds = new Set(params.advisoryCheckIds ?? []);
  const workers = checkInputs(inputs);
  const advisoryWorkers = workers.filter((worker) => advisoryIds.has(worker.id));
  const coreWorkers = workers.filter((worker) => !advisoryIds.has(worker.id));
  const status = rollupCoreStatus(coreWorkers);

  const findings = {
    policy: "Core verifier-of-verifier checks determine status. Advisory checks are summarized but do not make the verifier dashboard red or uncertain unless promoted to core.",
    coreCounts: statusCounts(coreWorkers),
    advisoryCounts: statusCounts(advisoryWorkers),
    coreChildren: coreWorkers.map(childSummary),
    advisoryChildren: advisoryWorkers.map(childSummary)
  };

  const summary = makeSummary(status, coreWorkers, advisoryWorkers);
  if (status === "pass") return pass(summary, { findings });
  if (status === "fail") return fail(summary, { findings });
  return uncertain(summary, { findings });
});
