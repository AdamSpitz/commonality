import { emit, errorResult, fail, pass, readInputs, uncertain, writeTextArtifact } from "../lib/result.mjs";
import {
  explorationBriefing,
  FILES_READ_FIELD_SPEC,
  getLlmResponse,
  mergedParams,
  parseJsonObject,
  resolveModel,
  validateJudgmentResponse,
  writeFilesReadArtifact
} from "../lib/llm-judgment.mjs";

// PROTOTYPE cofounder-eye leaf (sibling to review.viability / scalability /
// simplicity): the enumerative "go down the list and check each journey" leaf.
// review.viability asks the holistic "does the whole thing add up?"; this one is
// its concrete complement — enumerate the core use cases from the MVP scope and,
// for EACH, judge whether it's wired END-TO-END (a real user can get from entry
// to outcome) versus merely present as components/routes/green unit tests. This
// is Adam's altitude distinction made mechanical: "implemented at all" vs.
// "actually connects into a completable journey."
//
// Ground truth is specs/product/mvp.md (the enumerated use cases) plus the actual
// routes/manifests/pages. The model briefs itself, builds the use-case list from
// the MVP doc (not a hardcoded one, so it can't drift), then traces each.
//
// MILESTONE-AWARE GATING (shared machinery): an incomplete MVP journey is
// expected at ordinary-development, so it gates only at the rung where we'd claim
// it; a journey that is supposed to work ALREADY but is broken gates now. Each
// finding declares `blocksAtRung`; status is derived relative to milestone.json's
// current rung: fail iff a finding blocks at/below current, else uncertain if any
// findings, else pass.

const DEFAULT_TASK_KIND = "big-picture-thinking";

function parseMilestone(raw) {
  try {
    const m = JSON.parse(raw ?? "{}");
    const ladder = Array.isArray(m.ladder) ? m.ladder : [];
    const current = typeof m.current === "string" ? m.current : ladder[0] ?? null;
    return { ladder, current, note: m.note ?? "" };
  } catch {
    return { ladder: [], current: null, note: "" };
  }
}

function findingIsGating(finding, ladder, current) {
  const currentIdx = ladder.indexOf(current);
  const blockIdx = ladder.indexOf(finding?.blocksAtRung);
  if (currentIdx < 0 || blockIdx < 0) return false;
  return blockIdx <= currentIdx;
}

function statusRelativeToMilestone(findings, ladder, current) {
  const list = Array.isArray(findings) ? findings : [];
  if (list.some((f) => findingIsGating(f, ladder, current))) return "fail";
  if (list.length > 0) return "uncertain";
  return "pass";
}

function buildPrompt({ ladder, current, note }) {
  const rungList = ladder.length ? ladder.map((r) => (r === current ? `${r} (← WE ARE HERE)` : r)).join(" → ") : "(no ladder found)";
  return `${explorationBriefing({
    role: "skeptical product engineer who insists on tracing every core user journey end to end before believing it works",
    purpose: `Enumerate the core use cases Commonality's MVP is supposed to support, and for EACH ONE judge whether it is wired END-TO-END in the system as actually built — i.e. a real user could get from the entry point all the way to the intended outcome — versus merely PRESENT as components, routes, or passing unit tests that do not actually connect into a completable journey.

This is the enumerative complement to the holistic viability question. Do not judge the product as a whole; instead go down the list, use case by use case, and check each journey's connectivity. The distinction that matters: "the feature exists somewhere in the code" is NOT the same as "a user can complete this journey." Green unit tests, a route that renders, or a component in isolation are evidence of presence, not of end-to-end completeness.

Method:
1. Build the use-case list FROM THE MVP SCOPE (specs/product/mvp.md) and the product docs the README points to — do not invent a list or rely on memory. If the MVP scope names subsystems/journeys (e.g. contribute to a cause, create a project, sign a statement, delegate, fund content, browse/discover), those are your rows. Note which are explicitly in scope vs. deferred.
2. For each use case, trace the journey through the actual code: entry point (route/manifest) → the steps → the outcome. Prefer evidence of connectivity — the next step is actually reachable and wired to the prior one — over the mere existence of each piece. Watch for dead ends (a step that leads nowhere), missing links (two halves that don't connect), and outcomes that depend on something unbuilt/stubbed/manually-seeded.
3. Classify each use case: WIRED (plausibly completable end-to-end), PARTIAL (some steps connect, a specific link is missing), or ABSENT (entry exists but the journey cannot be completed). Report one finding per use case that is not WIRED.

Be concrete about WHERE each journey breaks (the specific route/step/component and the missing link), and say what evidence you did and didn't have (you are reading code, not running the app).`
  })}
MILESTONE CONTEXT — this is how your findings get gated, so read it carefully.

The project tracks a milestone ladder (the current thoroughness/readiness frontier). ${note ? `Project note: ${note}` : ""}
Ladder: ${rungList}

An incomplete MVP journey is EXPECTED during ordinary development — not every use case must be end-to-end today. What matters is: by which rung must each journey actually connect? For every finding set "blocksAtRung" to the LOWEST ladder rung by which the use case must be wired end-to-end:
- a journey that is supposed to work ALREADY (the docs/status claim it's done, or current work depends on it) but is broken/dead-ended → the current rung (${current ?? "current"});
- a core MVP journey that must be completable before we could honestly call this a release candidate → "release-candidate";
- a journey that only needs to be complete for a full public launch (e.g. because it depends on deliberately-deferred work like fiat on-ramps) → "full-launch".
The harness turns findings that block at or below the current rung into a deploy-blocking red and leaves the rest as advisory yellow. A use case that is explicitly DEFERRED in the MVP scope is not a current-rung failure — bucket it at the rung where it's promised. Reserve the current rung for journeys that should already connect but don't.

Return ONLY a single JSON object with this exact shape:
{
  "status": "pass" | "uncertain",
  "summary": "one-line summary: how many core use cases are wired end-to-end vs. partial/absent, and the most important gap",
${FILES_READ_FIELD_SPEC}
  "findings": [
    {
      "title": "short title naming the use case and where it breaks",
      "severity": "high" | "medium" | "low",
      "blocksAtRung": "${current ?? "ordinary-development"}" | "release-candidate" | "full-launch",
      "kind": "partial" | "absent" | "dead-end" | "unbuilt-dependency" | "docs-gap",
      "useCase": "the use case this finding is about",
      "evidence": ["the entry point traced, the specific step/link that is missing or dead-ends, and the doc claim vs. code reality"],
      "recommendation": "the concrete wiring that would complete the journey"
    }
  ],
  "reportMarkdown": "Markdown report with sections: Use cases in scope (from the MVP doc), Per-use-case status table (Wired / Partial / Absent with where it breaks), End-to-end gaps, Gaps by milestone rung, Skipped/uncertain scope"
}

Status policy:
- Use "uncertain" if any core use case is not confidently wired end-to-end and needs human triage.
- Use "pass" only if every in-scope-for-now use case is plausibly completable end-to-end and you found no dead ends after actively tracing them.
- Do not set "fail" yourself; the harness derives the gating status from each finding's severity AND its blocksAtRung relative to the current milestone rung.

Severity vs. rung — keep these distinct:
- "severity" = how central the broken journey is to the product.
- "blocksAtRung" = the earliest rung by which it must be wired end-to-end (this is what gates).
A central journey that is legitimately deferred to a later rung still stays advisory today; that is correct. If specs/product/mvp.md is missing or too vague to enumerate the use cases, that is a "docs-gap" finding worth reporting.`;
}

emit(async () => {
  const inputs = readInputs();
  const params = mergedParams(inputs);
  const milestoneInput = inputs.find((i) => i.kind === "file" && i.as === "milestone");
  const { ladder, current, note } = parseMilestone(milestoneInput?.content);

  const prompt = buildPrompt({ ladder, current, note });
  const promptArtifact = await writeTextArtifact("prompt.md", prompt, "text/markdown", "Cofounder-eye briefing supplied to the exploration-mode reviewer (it enumerates the MVP use cases and traces each journey through the actual code itself).");
  const model = resolveModel(params, {
    modelEnvVar: "COMMONALITY_VERIFIER_USE_CASE_COMPLETENESS_MODEL",
    defaultTaskKind: DEFAULT_TASK_KIND
  });

  let llmResult;
  try {
    llmResult = await getLlmResponse(prompt, params, promptArtifact.path, model, {
      fixtureEnvVar: "COMMONALITY_VERIFIER_USE_CASE_COMPLETENESS_FIXTURE_RESPONSE",
      commandEnvVar: "COMMONALITY_VERIFIER_USE_CASE_COMPLETENESS_COMMAND",
      explore: true
    });
  } catch (error) {
    return errorResult(`Could not run use-case-completeness review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact] });
  }

  const rawResponse = llmResult.text;
  const usage = llmResult.usage;
  const rawArtifact = await writeTextArtifact("raw-response.txt", rawResponse, "text/plain", "Raw LLM response before JSON parsing.");

  let review;
  try {
    review = validateJudgmentResponse(parseJsonObject(rawResponse), { arrayFields: ["findings", "filesRead"] });
  } catch (error) {
    return errorResult(`Could not parse use-case-completeness review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact, rawArtifact] });
  }

  const reportArtifact = await writeTextArtifact("report.md", review.reportMarkdown, "text/markdown", "Cofounder-eye per-use-case end-to-end completeness review, with gaps bucketed by milestone rung.");
  const filesReadArtifact = await writeFilesReadArtifact(review.filesRead);
  const findings = {
    filesRead: review.filesRead ?? [],
    findings: review.findings ?? [],
    milestone: { ladder, current },
    model: model ?? "command-default",
    usage
  };
  const artifacts = [promptArtifact, rawArtifact, reportArtifact, filesReadArtifact];

  const status = statusRelativeToMilestone(review.findings, ladder, current);
  const summary = current
    ? `${review.summary} (gated relative to milestone: ${current})`
    : review.summary;
  if (status === "fail") return fail(summary, { findings, artifacts });
  if (status === "pass") return pass(summary, { findings, artifacts });
  return uncertain(summary, { findings, artifacts });
});
