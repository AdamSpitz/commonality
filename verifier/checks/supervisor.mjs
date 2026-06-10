import { emit, fail, pass, readInputs, uncertain } from "./lib/result.mjs";
import {
  checkInputs,
  classifyChildren,
  childSummary,
  collectTopFindings,
  makeSummary,
  mergedParams,
  rollupStatus,
  statusCounts,
  withFreshness
} from "./lib/rollup.mjs";

emit(async () => {
  const inputs = readInputs();
  const params = mergedParams(inputs);
  const allWorkers = withFreshness(checkInputs(inputs), params.freshness);
  // Advisory children are summarized as evidence but never determine the rollup
  // status, nor count as missing/stale gating: they let a validation pass surface
  // non-gating signals (e.g. the standing review.* product-judgment leaves)
  // without letting a plausible uncertain or an un-run manual check turn it red.
  const advisoryIds = new Set(params.advisoryCheckIds ?? []);
  const advisoryWorkers = allWorkers.filter((worker) => advisoryIds.has(worker.id));
  const workers = allWorkers.filter((worker) => !advisoryIds.has(worker.id));
  const label = params.label ?? process.env.VERIFIER_CHECK_ID ?? "supervisor";
  const status = rollupStatus(params.rollup, workers);
  const counts = statusCounts(workers);
  const classification = classifyChildren(workers);
  const findings = {
    rollup: params.rollup ?? { type: "anyFail" },
    freshness: params.freshness ?? null,
    counts,
    classification,
    // Propagate the salient child findings upward so a parent (ultimately root)
    // can name what is wrong, not just which child is red.
    topFindings: collectTopFindings(workers),
    children: workers.map(childSummary),
    ...(advisoryWorkers.length > 0
      ? { advisoryPolicy: "Advisory children are summarized but never affect rollup status.", advisoryCounts: statusCounts(advisoryWorkers), advisoryChildren: advisoryWorkers.map(childSummary) }
      : {})
  };

  const summary = makeSummary(label, status, workers, counts, classification, advisoryWorkers);
  if (status === "pass") return pass(summary, { findings });
  if (status === "fail") return fail(summary, { findings });
  return uncertain(summary, { findings });
});
