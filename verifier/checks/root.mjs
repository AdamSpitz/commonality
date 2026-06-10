// The apex check: Commonality's top-level "is this ready to deploy?" dashboard
// AND its human-readable report, in one node.
//
// It does two jobs in one run:
//   1. Deterministic rollup — folds the four concern facets + verifier-health
//      into one gating status, exactly like the generic supervisor. This is what
//      gives `verifier-tree root` its red/green children to drill into. The LLM
//      never touches this status.
//   2. Narrative — writes the founder's "so where are we, really?" report to a
//      `report.md` artifact (press `o` in verifier-tree to read it), milestone-
//      framed, naming the top issue under each red facet from the findings each
//      facet propagated upward. The reader drills the tree for full detail.
//
// The narrative is the expensive half, so it is memoized internally: the rollup
// is recomputed every run (cheap, instant), but the model is only re-asked when a
// fingerprint of the child statuses + milestone has changed since the last run;
// otherwise the prior report.md is carried forward with no model call. (The
// harness's own `memoize` is too coarse here — it would skip the whole command
// and freeze the rollup.) If the model errors or returns garbage, root keeps its
// rollup status and flags the narrative failure rather than going red.

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { emit, fail, pass, readInputs, uncertain, workspacePath, writeTextArtifact } from "./lib/result.mjs";
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
import { generateNarrative } from "./lib/narrative.mjs";

const THIS_CHECK_ID = "root";

function fileInput(inputs, as) {
  const input = inputs.find((i) => i.kind === "file" && i.as === as);
  return input?.content ?? null;
}

function parseMilestone(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// Fingerprint the things the narrative depends on: each child's id/status/
// timestamp (sorted for stability) plus the raw milestone. If unchanged since the
// last run, the prior report.md is still valid and we skip the model call.
function fingerprint(workers, milestoneRaw) {
  const childState = workers
    .map((w) => ({ id: w.id, status: w.result?.status ?? "missing", timestamp: w.result?.timestamp ?? null }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return createHash("sha256").update(JSON.stringify({ childState, milestoneRaw: milestoneRaw ?? null })).digest("hex");
}

function resultsDir() {
  return process.env.VERIFIER_RESULTS ?? workspacePath("results");
}

// Read this check's most recent prior stored Result (newest runId), or null.
async function latestPriorResult() {
  const dir = path.join(resultsDir(), THIS_CHECK_ID);
  let files;
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return null;
  }
  for (const file of files.reverse()) {
    try {
      return JSON.parse(await readFile(path.join(dir, file), "utf8"));
    } catch {
      // skip unreadable/partial result files
    }
  }
  return null;
}

// Reuse the prior narrative when the fingerprint matches: copy its report.md
// forward into this run's artifact dir (so retention pruning the old run can't
// orphan it) and return the narrative shape generateNarrative would have.
async function reusePriorNarrative(prior) {
  const reportArtifact = (prior.artifacts ?? []).find(
    (a) => a.name === "report.md" || (a.path ?? "").endsWith("report.md")
  );
  if (!reportArtifact) return null;
  let markdown;
  try {
    markdown = await readFile(workspacePath(reportArtifact.path), "utf8");
  } catch {
    return null;
  }
  const copied = await writeTextArtifact("report.md", markdown, "text/markdown", "Human-readable state-of-the-project narrative (reused unchanged from the prior run — no model call).");
  const priorNarrative = prior.findings?.narrative ?? {};
  return {
    summary: prior.summary,
    priorities: priorNarrative.priorities ?? [],
    model: priorNarrative.model ?? "memoized",
    memoized: true,
    artifacts: [copied]
  };
}

emit(async () => {
  const inputs = readInputs();
  const params = mergedParams(inputs);
  const milestoneRaw = fileInput(inputs, "milestone");
  const milestone = parseMilestone(milestoneRaw);

  const allWorkers = withFreshness(checkInputs(inputs), params.freshness);
  const advisoryIds = new Set(params.advisoryCheckIds ?? []);
  const advisoryWorkers = allWorkers.filter((w) => advisoryIds.has(w.id));
  const gatingWorkers = allWorkers.filter((w) => !advisoryIds.has(w.id));

  // 1. Deterministic rollup over the gating children — the LLM never touches this.
  const label = params.label ?? THIS_CHECK_ID;
  const status = rollupStatus(params.rollup, gatingWorkers);
  const counts = statusCounts(gatingWorkers);
  const classification = classifyChildren(gatingWorkers);

  // 2. Narrative — memoized on the child statuses + milestone.
  const print = fingerprint([...gatingWorkers, ...advisoryWorkers], milestoneRaw);
  let narrative;
  let narrativeError = null;

  const prior = await latestPriorResult();
  if (prior?.findings?.narrative?.fingerprint === print) {
    narrative = await reusePriorNarrative(prior);
  }
  if (!narrative) {
    try {
      // Pass advisory leaves too so the report can mention report-currency /
      // backlog context; they still never affect the rollup status above.
      narrative = await generateNarrative([...gatingWorkers, ...advisoryWorkers], milestone, params);
    } catch (error) {
      narrativeError = error?.message ?? String(error);
      const degraded = `# Report unavailable\n\nThe rollup status is **${status}**, but the narrative model could not be generated this run:\n\n> ${narrativeError}\n\nThe dashboard rollup below is unaffected; drill into the tree for per-check detail.`;
      const degradedArtifact = await writeTextArtifact("report.md", degraded, "text/markdown", "Degraded report: narrative generation failed; rollup status is still authoritative.");
      narrative = { summary: null, priorities: [], model: null, artifacts: [degradedArtifact] };
    }
  }

  const summary = makeSummary(label, status, gatingWorkers, counts, classification, advisoryWorkers)
    + (narrative.summary ? ` — ${narrative.summary}` : narrativeError ? " — (narrative unavailable)" : "");

  const findings = {
    rollup: params.rollup ?? { type: "anyFail" },
    freshness: params.freshness ?? null,
    counts,
    classification,
    topFindings: collectTopFindings(gatingWorkers),
    children: gatingWorkers.map(childSummary),
    ...(advisoryWorkers.length > 0
      ? { advisoryPolicy: "Advisory children inform the narrative but never affect rollup status.", advisoryCounts: statusCounts(advisoryWorkers), advisoryChildren: advisoryWorkers.map(childSummary) }
      : {}),
    narrative: {
      fingerprint: print,
      memoized: Boolean(narrative.memoized),
      model: narrative.model ?? null,
      priorities: narrative.priorities ?? [],
      ...(narrativeError ? { error: narrativeError } : {})
    }
  };

  const out = { findings, artifacts: narrative.artifacts };
  if (status === "pass") return pass(summary, out);
  if (status === "fail") return fail(summary, out);
  return uncertain(summary, out);
});
