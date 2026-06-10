// Shared rollup/classification logic for supervisor checks.
//
// Both the generic `checks/supervisor.mjs` and the bespoke apex `checks/root.mjs`
// fold a set of child Results into one status + a structured classification.
// Keeping the logic here means the apex narrates over exactly the same rollup the
// dashboard gates on, and that every supervisor propagates its children's salient
// findings upward identically (so root can name the top issue under each red
// facet without reaching past its direct children).

export function checkInputs(inputs) {
  return inputs.filter((input) => input.kind === "check");
}

export function paramsInputs(inputs) {
  return inputs.filter((input) => input.kind === "params").map((input) => input.data ?? {});
}

export function mergedParams(inputs) {
  return Object.assign({}, ...paramsInputs(inputs));
}

export function minutesSince(timestamp) {
  if (!timestamp) return null;
  const time = Date.parse(timestamp);
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 60000));
}

function maxAgeFor(worker, freshness) {
  if (!freshness) return null;
  const byId = freshness.byIdMinutes?.[worker.id];
  if (byId !== undefined) return Number(byId);
  const byRole = freshness.byRoleMinutes?.[worker.role];
  if (byRole !== undefined) return Number(byRole);
  const defaultMaxAge = freshness.requiredMaxAgeMinutes ?? freshness.maxAgeMinutes;
  return defaultMaxAge === undefined ? null : Number(defaultMaxAge);
}

export function freshnessFor(worker, freshness) {
  const maxAgeMinutes = maxAgeFor(worker, freshness);
  if (maxAgeMinutes === null || Number.isNaN(maxAgeMinutes)) return null;
  const ageMinutes = minutesSince(worker.result?.timestamp);
  if (!worker.result) return { status: "missing", ageMinutes, maxAgeMinutes, stale: true };
  if (ageMinutes === null) return { status: "stale", ageMinutes, maxAgeMinutes, stale: true };
  const stale = ageMinutes > maxAgeMinutes;
  return { status: stale ? "stale" : "fresh", ageMinutes, maxAgeMinutes, stale };
}

export function withFreshness(workers, freshness) {
  return workers.map((worker) => ({ ...worker, freshness: freshnessFor(worker, freshness) }));
}

export function statusOf(worker) {
  if (!worker.result) return "missing";
  if (worker.freshness?.stale && !["fail", "error"].includes(worker.result.status)) return "uncertain";
  return worker.result.status;
}

export function statusCounts(workers) {
  return workers.reduce((acc, worker) => {
    const status = statusOf(worker);
    acc[status] = (acc[status] ?? 0) + 1;
    if (worker.result && worker.freshness?.stale) acc.stale = (acc.stale ?? 0) + 1;
    return acc;
  }, {});
}

function defaultRollup(workers) {
  if (workers.some((worker) => worker.result?.status === "fail")) return "fail";
  if (workers.some((worker) => worker.result?.status === "error")) return "uncertain";
  if (workers.some((worker) => worker.freshness?.stale)) return "uncertain";
  if (workers.some((worker) => worker.result?.status === "uncertain")) return "uncertain";
  if (workers.some((worker) => !worker.result)) return "uncertain";
  return "pass";
}

export function rollupStatus(rule, workers) {
  const type = rule?.type ?? "anyFail";
  if (type === "anyFail") return defaultRollup(workers);

  if (type === "allPass") {
    if (workers.length === 0) return "pass";
    if (workers.every((worker) => worker.result?.status === "pass" && !worker.freshness?.stale)) return "pass";
    if (workers.some((worker) => worker.result?.status === "fail")) return "fail";
    return "uncertain";
  }

  if (type === "fractionUncertain") {
    const threshold = Number(rule.threshold ?? 0.3);
    if (workers.some((worker) => worker.result?.status === "fail")) return "fail";
    const soft = workers.filter((worker) => !worker.result || worker.result.status === "uncertain" || worker.result.status === "error" || worker.freshness?.stale).length;
    return workers.length > 0 && soft / workers.length > threshold ? "uncertain" : "pass";
  }

  throw new Error(`Unknown supervisor rollup rule: ${type}`);
}

export function childSummary(worker) {
  return {
    id: worker.id,
    role: worker.role,
    status: statusOf(worker),
    originalStatus: worker.result?.status ?? "missing",
    summary: worker.result?.summary ?? "No result yet",
    timestamp: worker.result?.timestamp ?? null,
    ...(worker.freshness ? { freshness: worker.freshness } : {})
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

export function classifyChildren(workers) {
  const skippedByPolicy = workers.filter(isSkippedByPolicy).map(childSummary);
  const missingAttestations = workers.filter(isMissingOrStaleAttestation).map(childSummary);
  const staleResults = workers
    .filter((worker) => worker.result && worker.freshness?.stale && !isSkippedByPolicy(worker) && !isMissingOrStaleAttestation(worker))
    .map(childSummary);
  const systemFailures = workers
    .filter((worker) => statusOf(worker) === "fail")
    .map(childSummary);
  const blindSpots = workers
    .filter((worker) => ["missing", "error"].includes(statusOf(worker)) && !isSkippedByPolicy(worker) && !isMissingOrStaleAttestation(worker))
    .map(childSummary);
  const otherUncertain = workers
    .filter((worker) => statusOf(worker) === "uncertain" && !isMissingOrStaleAttestation(worker) && !worker.freshness?.stale)
    .map(childSummary);

  return { systemFailures, blindSpots, missingAttestations, skippedByPolicy, staleResults, otherUncertain };
}

export function classificationParts(classification) {
  return [
    ["system failures", classification.systemFailures.length],
    ["blind spots", classification.blindSpots.length],
    ["missing/stale attestations", classification.missingAttestations.length],
    ["skipped by policy", classification.skippedByPolicy.length],
    ["stale results", classification.staleResults.length],
    ["other uncertain", classification.otherUncertain.length]
  ]
    .filter(([, count]) => count > 0)
    .map(([label, count]) => `${count} ${label}`);
}

export function advisoryParts(advisoryWorkers) {
  const counts = statusCounts(advisoryWorkers);
  return ["pass", "fail", "uncertain", "error", "missing"]
    .filter((statusName) => counts[statusName])
    .map((statusName) => `${counts[statusName]} advisory ${statusName}`)
    .join(", ");
}

export function makeSummary(label, status, workers, counts, classification, advisoryWorkers) {
  if (workers.length === 0 && advisoryWorkers.length === 0) return `${label}: no child checks configured.`;
  const parts = ["pass", "fail", "uncertain", "error", "missing"]
    .filter((statusName) => counts[statusName])
    .map((statusName) => `${counts[statusName]} ${statusName}`)
    .join(", ");
  const classified = classificationParts(classification).join("; ");
  const advisory = advisoryParts(advisoryWorkers);
  return `${label}: ${status} (${parts || "no core checks"}${advisory ? `; ${advisory}` : ""})${classified ? ` — ${classified}` : ""}.`;
}

const SEVERITY_RANK = { blocker: 0, high: 1, medium: 2, low: 3, info: 4 };

function severityRank(severity) {
  const rank = SEVERITY_RANK[String(severity ?? "").toLowerCase()];
  return rank === undefined ? 5 : rank;
}

// Fold each child's salient findings into a bounded, severity-sorted list so a
// parent supervisor's Result carries *what* is wrong, not just *which child* is
// red. Sources per child: leaf findings (`findings.findings[]`) and findings a
// sub-supervisor already propagated (`findings.topFindings[]`). Each entry is
// tagged with the direct child it came through (`fromId`) and, when known, the
// original leaf (`originId`) so a chain like root → facet → leaf stays legible.
export function collectTopFindings(workers, limit = 5) {
  const collected = [];
  for (const worker of workers) {
    const findings = worker.result?.findings ?? {};
    const leafFindings = Array.isArray(findings.findings) ? findings.findings : [];
    for (const finding of leafFindings) {
      collected.push({
        fromId: worker.id,
        originId: worker.id,
        severity: finding.severity ?? null,
        title: finding.title ?? "(untitled)",
        recommendation: finding.recommendation ?? null
      });
    }
    const propagated = Array.isArray(findings.topFindings) ? findings.topFindings : [];
    for (const finding of propagated) {
      collected.push({
        fromId: worker.id,
        originId: finding.originId ?? finding.fromId ?? worker.id,
        severity: finding.severity ?? null,
        title: finding.title ?? "(untitled)",
        recommendation: finding.recommendation ?? null
      });
    }
  }
  collected.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  return collected.slice(0, limit);
}
