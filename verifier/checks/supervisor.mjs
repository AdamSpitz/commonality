import { emit, fail, pass, readInputs, uncertain } from "./lib/result.mjs";

function checkInputs(inputs) {
  return inputs.filter((input) => input.kind === "check");
}

function paramsInputs(inputs) {
  return inputs.filter((input) => input.kind === "params").map((input) => input.data ?? {});
}

function mergedParams(inputs) {
  return Object.assign({}, ...paramsInputs(inputs));
}

function statusCounts(workers) {
  return workers.reduce((acc, worker) => {
    const status = worker.result?.status ?? "missing";
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {});
}

function defaultRollup(workers) {
  if (workers.some((worker) => worker.result?.status === "fail")) return "fail";
  if (workers.some((worker) => worker.result?.status === "error")) return "uncertain";
  if (workers.some((worker) => worker.result?.status === "uncertain")) return "uncertain";
  if (workers.some((worker) => !worker.result)) return "uncertain";
  return "pass";
}

function rollupStatus(rule, workers) {
  const type = rule?.type ?? "anyFail";
  if (type === "anyFail") return defaultRollup(workers);

  if (type === "allPass") {
    if (workers.length === 0) return "pass";
    if (workers.every((worker) => worker.result?.status === "pass")) return "pass";
    if (workers.some((worker) => worker.result?.status === "fail")) return "fail";
    return "uncertain";
  }

  if (type === "fractionUncertain") {
    const threshold = Number(rule.threshold ?? 0.3);
    if (workers.some((worker) => worker.result?.status === "fail")) return "fail";
    const soft = workers.filter((worker) => !worker.result || worker.result.status === "uncertain" || worker.result.status === "error").length;
    return workers.length > 0 && soft / workers.length > threshold ? "uncertain" : "pass";
  }

  throw new Error(`Unknown supervisor rollup rule: ${type}`);
}

function makeSummary(label, status, workers, counts) {
  if (workers.length === 0) return `${label}: no child checks configured.`;
  const parts = ["pass", "fail", "uncertain", "error", "missing"]
    .filter((statusName) => counts[statusName])
    .map((statusName) => `${counts[statusName]} ${statusName}`)
    .join(", ");
  return `${label}: ${status} (${parts}).`;
}

emit(async () => {
  const inputs = readInputs();
  const workers = checkInputs(inputs);
  const params = mergedParams(inputs);
  const label = params.label ?? process.env.VERIFIER_CHECK_ID ?? "supervisor";
  const status = rollupStatus(params.rollup, workers);
  const counts = statusCounts(workers);
  const findings = {
    rollup: params.rollup ?? { type: "anyFail" },
    counts,
    children: workers.map((worker) => ({
      id: worker.id,
      role: worker.role,
      status: worker.result?.status ?? "missing",
      summary: worker.result?.summary ?? "No result yet"
    }))
  };

  const summary = makeSummary(label, status, workers, counts);
  if (status === "pass") return pass(summary, { findings });
  if (status === "fail") return fail(summary, { findings });
  return uncertain(summary, { findings });
});
