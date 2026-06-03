import { emit, errorResult, pass, readInputs, truncate, uncertain, writeTextArtifact } from "../lib/result.mjs";
import { getLlmResponse, mergedParams, parseJsonObject, resolveModel, validateJudgmentResponse } from "../lib/llm-judgment.mjs";

// Narrative-synthesis leaf. The other LLM leaves each form an opinion over one
// bounded surface (just the docs, just the landing copy). This one stands back
// and reads the *dashboard itself*: the latest stored facet rollups plus the
// finding-rich review/coverage leaves, and asks a model to write the founder's
// "so where are we, really?" report — what works, what is genuinely broken vs.
// merely unverified, and the prioritized remaining work.
//
// It is deliberately NON-GATING. Its job is to describe the dashboard, not to be
// another gate on it (the facets already gate). So it reads stored results rather
// than re-running anything — cheap, and it can never make root red. It is wired
// advisory under meta.verifier-health. Status mirrors the model's own pass/
// uncertain verdict only to colour the summary line; advisory placement means
// that verdict never propagates into gating.
//
// Because it reads *stored* results, a facet it summarizes may be stale. Rather
// than silently trust an old world, it computes each input's age and tells the
// model which inputs are stale so the report can flag "described from a N-day-old
// run" instead of asserting current truth.

const DEFAULT_TASK_KIND = "clear-communication";

function checkInputs(inputs) {
  return inputs.filter((input) => input.kind === "check");
}

function minutesSince(timestamp) {
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

// Render one input's stored result into compact, model-readable evidence. Two
// shapes matter: judgment/coverage leaves carry findings.findings[] (title /
// severity / recommendation) — the actual work list — and supervisor rollups
// carry findings.classification (which children are real failures vs. missing
// vs. skipped-by-policy). Anything else falls back to a trimmed JSON dump.
function renderWorker(worker, params) {
  const result = worker.result;
  const ageMinutes = minutesSince(result?.timestamp);
  const stale = ageMinutes !== null && ageMinutes > Number(params.staleAfterMinutes ?? 1440);
  const header = `### ${worker.id} (${worker.role}) — ${result ? result.status : "NO RESULT YET"}, ${describeAge(ageMinutes)}${stale ? " [STALE]" : ""}`;

  if (!result) return `${header}\n\n_No stored result; this part of the project has not been verified yet._`;

  const lines = [header, "", result.summary ?? "(no summary)"];
  const findings = result.findings ?? {};

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
  } else {
    lines.push("", "```json", truncate(JSON.stringify(findings, null, 2), Number(params.maxFindingsChars ?? 8000)), "```");
  }

  return lines.join("\n");
}

function buildPrompt(workers, params) {
  const rendered = workers.map((worker) => renderWorker(worker, params)).join("\n\n---\n\n");

  return `You are the founder of Commonality reading your verifier dashboard. Write the honest "so where are we, really?" status report you would want before deciding what to work on next or whether to show the project to the world.

You are given the latest stored result for each concern facet (does it work / do the docs cohere / is it compelling / is the on-chain surface sound) plus the finding-rich review and coverage leaves underneath them. Some results may be marked [STALE] or "NO RESULT YET" — treat those as "not currently known", not as good news, and say so explicitly rather than implying the area is fine.

Write for a smart reader who knows the project but has not looked at the dashboard today. Be concrete and specific; cite the check id and the actual finding when you make a claim. Do not pad or cheerlead.

Your report must cover:
- **Overall state** — one honest paragraph: roughly how close is this to "ready to show the world", and what is the single biggest thing standing in the way.
- **What's working** — facets/leaves that are genuinely green, briefly.
- **What's actually broken** — real failures (high-severity findings, red facets), most important first, each with the check id and the concrete fix.
- **What's unverified vs. broken** — areas that are merely stale, missing a result, or skipped-by-policy. Make clear these are blind spots, not problems found.
- **Prioritized next work** — an ordered list (highest priority first) of what to do next, each item naming the check/finding it comes from and why it ranks where it does.

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

emit(async () => {
  const inputs = readInputs();
  const params = mergedParams(inputs);
  const workers = checkInputs(inputs);

  if (workers.length === 0) {
    return errorResult("No dashboard check inputs supplied to state-of-project synthesis.");
  }

  const prompt = buildPrompt(workers, params);
  const promptArtifact = await writeTextArtifact("prompt.md", prompt, "text/markdown", "Prompt and the stored dashboard results supplied to the synthesis model.");
  const model = resolveModel(params, {
    modelEnvVar: "COMMONALITY_VERIFIER_STATE_OF_PROJECT_MODEL",
    defaultTaskKind: DEFAULT_TASK_KIND
  });

  let rawResponse;
  try {
    rawResponse = await getLlmResponse(prompt, params, promptArtifact.path, model, {
      fixtureEnvVar: "COMMONALITY_VERIFIER_STATE_OF_PROJECT_FIXTURE_RESPONSE",
      commandEnvVar: "COMMONALITY_VERIFIER_STATE_OF_PROJECT_COMMAND"
    });
  } catch (error) {
    return errorResult(`Could not run state-of-project synthesis: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact] });
  }

  const rawArtifact = await writeTextArtifact("raw-response.txt", rawResponse, "text/plain", "Raw LLM response before JSON parsing.");

  let report;
  try {
    report = validateJudgmentResponse(parseJsonObject(rawResponse), { arrayFields: ["priorities"] });
  } catch (error) {
    return errorResult(`Could not parse state-of-project synthesis: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact, rawArtifact] });
  }

  const reportArtifact = await writeTextArtifact("state-of-project.md", report.reportMarkdown, "text/markdown", "Human-readable state-of-the-project narrative synthesized from the latest dashboard results.");
  const findings = {
    inputs: workers.map((worker) => ({
      id: worker.id,
      role: worker.role,
      status: worker.result?.status ?? "missing",
      ageMinutes: minutesSince(worker.result?.timestamp),
      timestamp: worker.result?.timestamp ?? null
    })),
    priorities: report.priorities ?? [],
    model: model ?? "command-default"
  };
  const artifacts = [promptArtifact, rawArtifact, reportArtifact];

  // Honour the model's advisory verdict only to colour the summary line; advisory
  // placement under meta.verifier-health keeps this from ever gating root.
  if (report.status === "pass") return pass(report.summary, { findings, artifacts });
  return uncertain(report.summary, { findings, artifacts });
});
