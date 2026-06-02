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

function childSummary(worker) {
  return {
    id: worker.id,
    role: worker.role,
    status: statusOf(worker),
    summary: worker.result?.summary ?? "No result yet",
    timestamp: worker.result?.timestamp ?? null
  };
}

function isManualAttestation(worker) {
  return worker.role === "manual-attestation" || worker.role === "qa-synthesis" || worker.id?.startsWith("review.");
}

function isSkippedByPolicy(worker) {
  const status = statusOf(worker);
  const summary = worker.result?.summary ?? "";
  const findings = worker.result?.findings ?? {};
  return status === "error" && (
    /Refusing to run/.test(summary) ||
    Boolean(findings.requireEnv) ||
    Boolean(findings.requiredEnv) ||
    Boolean(findings.mutatesState)
  );
}

function isMissingOrStaleAttestation(worker) {
  if (!isManualAttestation(worker)) return false;
  const status = statusOf(worker);
  const summary = worker.result?.summary ?? "";
  const findings = worker.result?.findings ?? {};
  return status === "missing" || (
    status === "uncertain" && (
      findings.problem === "missing-report" ||
      /no matching report|report is stale|report is incomplete/i.test(summary)
    )
  );
}

function classifyChildren(workers) {
  const skippedByPolicy = workers.filter(isSkippedByPolicy).map(childSummary);
  const missingAttestations = workers.filter(isMissingOrStaleAttestation).map(childSummary);
  const systemFailures = workers
    .filter((worker) => statusOf(worker) === "fail")
    .map(childSummary);
  const blindSpots = workers
    .filter((worker) => ["missing", "error"].includes(statusOf(worker)) && !isSkippedByPolicy(worker) && !isMissingOrStaleAttestation(worker))
    .map(childSummary);
  const otherUncertain = workers
    .filter((worker) => statusOf(worker) === "uncertain" && !isMissingOrStaleAttestation(worker))
    .map(childSummary);

  return { systemFailures, blindSpots, missingAttestations, skippedByPolicy, otherUncertain };
}

function classificationParts(classification) {
  return [
    ["system failures", classification.systemFailures.length],
    ["blind spots", classification.blindSpots.length],
    ["missing/stale attestations", classification.missingAttestations.length],
    ["skipped by policy", classification.skippedByPolicy.length],
    ["other uncertain", classification.otherUncertain.length]
  ]
    .filter(([, count]) => count > 0)
    .map(([label, count]) => `${count} ${label}`);
}

function makeSummary(label, status, workers, counts, classification) {
  if (workers.length === 0) return `${label}: no child checks configured.`;
  const parts = ["pass", "fail", "uncertain", "error", "missing"]
    .filter((statusName) => counts[statusName])
    .map((statusName) => `${counts[statusName]} ${statusName}`)
    .join(", ");
  const classified = classificationParts(classification).join("; ");
  return `${label}: ${status} (${parts})${classified ? ` — ${classified}` : ""}.`;
}

emit(async () => {
  const inputs = readInputs();
  const workers = checkInputs(inputs);
  const params = mergedParams(inputs);
  const label = params.label ?? process.env.VERIFIER_CHECK_ID ?? "supervisor";
  const status = rollupStatus(params.rollup, workers);
  const counts = statusCounts(workers);
  const classification = classifyChildren(workers);
  const findings = {
    rollup: params.rollup ?? { type: "anyFail" },
    counts,
    classification,
    children: workers.map(childSummary)
  };

  const summary = makeSummary(label, status, workers, counts, classification);
  if (status === "pass") return pass(summary, { findings });
  if (status === "fail") return fail(summary, { findings });
  return uncertain(summary, { findings });
});
