// The "so where are we, really?" narrative generator — root's prose face.
//
// Given the already-resolved child Results that root rolls up (the four facets +
// verifier-health, each now carrying propagated `topFindings`), the current
// milestone, and the advisory leaves, ask a model to write the founder's honest
// status report and a prioritized next-work list scoped to the current milestone.
//
// This is pure narration over stored results: it never re-runs anything and its
// verdict never gates (root's status is the deterministic rollup; this only
// colours the prose). It THROWS on unusable model output so the caller can decide
// how to degrade — root keeps its rollup status and flags the narrative failure;
// the known-bad fixture asserts the rejection.

import { truncate, writeTextArtifact } from "./result.mjs";
import { getLlmResponse, parseJsonObject, resolveModel, validateJudgmentResponse } from "./llm-judgment.mjs";

const DEFAULT_TASK_KIND = "clear-communication";

export function minutesSince(timestamp) {
  if (!timestamp) return null;
  const time = Date.parse(timestamp);
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 60000));
}

function describeAge(ageMinutes) {
  if (ageMinutes === null) return "age unknown";
  if (ageMinutes < 60) return `${ageMinutes}m ago`;
  if (ageMinutes < 1440) return `${Math.floor(ageMinutes / 60)}h ago`;
  return `${Math.floor(ageMinutes / 1440)}d ago`;
}

// Render one child's stored result into compact, model-readable evidence. The
// shapes that matter: rollup children carry `topFindings` (the salient findings
// propagated up from their own leaves) and `classification` (which grandchildren
// are real failures vs. missing vs. skipped-by-policy); leaf judgment children
// carry `findings.findings[]` directly. Anything else falls back to a JSON dump.
function renderWorker(worker, params) {
  const result = worker.result;
  const ageMinutes = minutesSince(result?.timestamp);
  const stale = ageMinutes !== null && ageMinutes > Number(params.staleAfterMinutes ?? 1440);
  const header = `### ${worker.id} (${worker.role}) — ${result ? result.status : "NO RESULT YET"}, ${describeAge(ageMinutes)}${stale ? " [STALE]" : ""}`;

  if (!result) return `${header}\n\n_No stored result; this part of the project has not been verified yet._`;

  const lines = [header, "", result.summary ?? "(no summary)"];
  const findings = result.findings ?? {};

  if (Array.isArray(findings.topFindings) && findings.topFindings.length > 0) {
    lines.push("", "Top issues (propagated from this facet's leaves):");
    for (const finding of findings.topFindings) {
      const via = finding.originId && finding.originId !== finding.fromId ? `${finding.fromId} ← ${finding.originId}` : finding.fromId;
      lines.push(`- [${finding.severity ?? "?"}] ${finding.title ?? "(untitled)"} (${via})`);
      if (finding.recommendation) lines.push(`  - fix: ${finding.recommendation}`);
    }
  }

  if (Array.isArray(findings.findings) && findings.findings.length > 0) {
    lines.push("", "Findings:");
    for (const finding of findings.findings) {
      lines.push(`- [${finding.severity ?? "?"}] ${finding.title ?? "(untitled)"}`);
      if (finding.recommendation) lines.push(`  - fix: ${finding.recommendation}`);
    }
  } else if (findings.classification) {
    const c = findings.classification;
    const bucket = (label, list) => (Array.isArray(list) && list.length > 0)
      ? lines.push(`- ${label}: ${list.map((child) => child.id).join(", ")}`)
      : null;
    lines.push("", "Children by category:");
    bucket("real failures", c.systemFailures);
    bucket("blind spots (missing/errored)", c.blindSpots);
    bucket("missing/stale attestations", c.missingAttestations);
    bucket("skipped by policy", c.skippedByPolicy);
    bucket("stale results", c.staleResults);
    bucket("other uncertain", c.otherUncertain);
  } else if (!Array.isArray(findings.topFindings) || findings.topFindings.length === 0) {
    lines.push("", "```json", truncate(JSON.stringify(findings, null, 2), Number(params.maxFindingsChars ?? 8000)), "```");
  }

  return lines.join("\n");
}

function milestoneSection(milestone) {
  if (!milestone?.current) {
    return "Current milestone: UNKNOWN (milestone.json missing or unparseable). Report every red as if it were work-now, but flag that the milestone frontier could not be read.";
  }
  const ladder = Array.isArray(milestone.ladder) ? milestone.ladder.join(" → ") : "(no ladder)";
  const idx = Array.isArray(milestone.ladder) ? milestone.ladder.indexOf(milestone.current) : -1;
  const next = idx >= 0 && idx < (milestone.ladder.length - 1) ? milestone.ladder[idx + 1] : null;
  return [
    `Current milestone (the thoroughness frontier we are working toward): **${milestone.current}**`,
    `Milestone ladder: ${ladder}`,
    next ? `Next rung if this one goes green: **${next}**` : "This is the top rung.",
    milestone.note ? `Milestone note: ${milestone.note}` : null,
    "",
    "Use the milestone to separate real work-now from deferred thoroughness: a check that is red or unverified but only mandatory at a HIGHER rung is a deliberate deferral, not a problem found — say so and do not rank it among the work-now priorities. Reserve the priority list for what is mandatory at or below the current milestone. If everything mandatory at or below the current milestone is genuinely green and current, say the rung is clear and recommend advancing the milestone" + (next ? ` to **${next}** (opt in and refresh that rung's guarded/deep checks).` : " (already at the top rung — recommend the full-launch go/no-go read).")
  ].filter((line) => line !== null).join("\n");
}

function buildPrompt(workers, milestone, params) {
  const rendered = workers.map((worker) => renderWorker(worker, params)).join("\n\n---\n\n");

  return `You are the founder of Commonality reading your verifier dashboard. Write the honest "so where are we, really?" status report you would want before deciding what to work on next or whether to show the project to the world.

${milestoneSection(milestone)}

You are given the latest stored result for each concern facet (does it work / do the docs cohere / is it compelling / is the on-chain surface sound) and verifier-health, each carrying the salient findings propagated up from its own leaves. Some results may be marked [STALE] or "NO RESULT YET" — treat those as "not currently known", not as good news, and say so explicitly rather than implying the area is fine. The reader can drill into the dashboard tree for full per-leaf detail, so keep this an executive summary: name the top issue under each red facet (cite the propagated check id), but do not try to reproduce every finding.

Write for a smart reader who knows the project but has not looked at the dashboard today. Be concrete and specific; cite the check id and the actual finding when you make a claim. Do not pad or cheerlead.

Your report must cover:
- **Overall state** — one honest paragraph: roughly how close is this to "ready to show the world", and what is the single biggest thing standing in the way.
- **What's working** — facets that are genuinely green, briefly.
- **What's actually broken** — real failures (red facets), most important first, each naming the propagated check id and the concrete fix.
- **What's unverified vs. broken** — areas that are merely stale, missing a result, or skipped-by-policy. Make clear these are blind spots, not problems found.
- **Prioritized next work** — an ordered list (highest priority first) of what to do next *for the current milestone*, each item naming the check/finding it comes from and why it ranks where it does. Do not include deferred higher-rung thoroughness here. If the current rung is clear, this section is the recommendation to advance the milestone instead.

Return ONLY a single JSON object with this exact shape:
{
  "status": "pass" | "uncertain",
  "summary": "one-line headline of the project's current state",
  "priorities": ["ordered short next-work items, highest first"],
  "reportMarkdown": "the full report, using the section headings above"
}

Status policy (advisory only — it colours the summary, it does not gate anything):
- "uncertain" if anything is broken, stale, or unverified enough that you would not yet tell the world it's ready.
- "pass" only if every facet you were given is genuinely green and current.

Latest stored dashboard results follow.

${rendered}`;
}

// Run the synthesis. Returns { status, summary, priorities, reportMarkdown,
// model, artifacts }. Throws on an LLM error or unusable model output (the caller
// decides how to degrade). Writes prompt/raw/report artifacts into the running
// check's artifact dir.
export async function generateNarrative(workers, milestone, params) {
  const prompt = buildPrompt(workers, milestone, params);
  const promptArtifact = await writeTextArtifact("prompt.md", prompt, "text/markdown", "Prompt and the stored dashboard results supplied to the synthesis model.");
  const model = resolveModel(params, {
    modelEnvVar: "COMMONALITY_VERIFIER_ROOT_REPORT_MODEL",
    defaultTaskKind: DEFAULT_TASK_KIND
  });

  const rawResponse = await getLlmResponse(prompt, params, promptArtifact.path, model, {
    fixtureEnvVar: "COMMONALITY_VERIFIER_ROOT_REPORT_FIXTURE_RESPONSE",
    commandEnvVar: "COMMONALITY_VERIFIER_ROOT_REPORT_COMMAND"
  });
  const rawArtifact = await writeTextArtifact("raw-response.txt", rawResponse, "text/plain", "Raw LLM response before JSON parsing.");

  const report = validateJudgmentResponse(parseJsonObject(rawResponse), { arrayFields: ["priorities"] });
  const reportArtifact = await writeTextArtifact("report.md", report.reportMarkdown, "text/markdown", "Human-readable state-of-the-project narrative synthesized from the latest dashboard results.");

  return {
    status: report.status,
    summary: report.summary,
    priorities: report.priorities ?? [],
    reportMarkdown: report.reportMarkdown,
    model: model ?? "command-default",
    artifacts: [promptArtifact, rawArtifact, reportArtifact]
  };
}
