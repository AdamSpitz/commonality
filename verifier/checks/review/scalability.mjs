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

// PROTOTYPE cofounder-eye leaf (sibling to review.viability): the "will this
// paint us into a corner at scale?" question. It is NOT a load test — it is a
// first-principles architectural read. Ground truth is the project's own stated
// scaling plan (specs/tech/scalability.md), which is deliberately opinionated:
// it declares which components are "fine", names the known non-scalable queries,
// and lists deferred mitigations (CDN, caching, cursors, elastic services). The
// model briefs itself, then judges the architecture AS BUILT against that plan —
// looking for drift, unmitigated hotspots that have become urgent, and
// hard-to-undo corners — rather than re-deriving scaling theory from scratch.
//
// MILESTONE-AWARE GATING (shared with review.viability): scaling is explicitly a
// "don't stress before we have users" concern, so almost nothing here should
// block ordinary development. Each finding declares `blocksAtRung` (the lowest
// milestone ladder rung by which it must be addressed) and status is derived
// relative to milestone.json's current rung: fail iff a finding blocks at/below
// current, else uncertain if any findings, else pass.

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
    role: "skeptical staff engineer / technical cofounder who owns whether this architecture survives growth",
    purpose: `Judge, from first principles, whether the Commonality architecture AS IT IS ACTUALLY BUILT will scale — or whether a current design choice is quietly painting us into a corner that becomes painful or scary to undo once there are real users and real data volume.

This is NOT a load test and NOT a demand to prematurely optimize. The project's stated philosophy is explicitly "don't stress about scalability before we have users." Your job is the architect's version of that: make sure the SHAPE of the system keeps scaling cheap and non-scary, and flag only the places where that is not currently true.

You have a strong piece of ground truth: the project's own stated scaling plan in specs/tech/scalability.md. Read it FIRST. It is deliberately opinionated — it declares which components are "fine", names the specific known-non-scalable queries (global ranking/enumeration, Aligning cross-entity aggregation, leaderboards/cause boards), and lists deferred mitigations (IPFS CDN/gateway, API caching + rate limits, SDK fold cursors, elastic/stateless services, sharded finders). Treat that document as the intended plan, then compare it against what the code and services actually do now.

Judge the gap in three directions:
1. DRIFT — the code has diverged from the stated plan (e.g. a query the doc assumed is per-entity is actually doing a global fold; a service the doc calls stateless holds state; a mitigation the doc says is "done" isn't, or vice-versa).
2. UNMITIGATED HOTSPOT — a scaling risk the doc acknowledges but defers has, in the current code, no seam/plan to address it, or has quietly become load-bearing on a hot path (so it will bite sooner than the doc implies).
3. CORNER — a current architectural choice that is cheap to change now but would be expensive/scary to undo once there is production data or live users (data model, event schema, addressing, coupling). These are the ones most worth catching early even though they don't hurt yet.

Also flag PREMATURE COMPLEXITY: places where the system is already carrying scaling machinery it does not need at its current stage (the inverse problem — over-engineering that adds complexity for load we won't see for a long time).`
  })}
MILESTONE CONTEXT — this is how your findings get gated, so read it carefully.

The project tracks a milestone ladder (the current thoroughness/readiness frontier). ${note ? `Project note: ${note}` : ""}
Ladder: ${rungList}

Scaling concerns are almost never an ordinary-development emergency — the whole point is to keep scaling cheap LATER, not to do it now. For every finding set "blocksAtRung" to the LOWEST ladder rung by which the concern must be ADDRESSED (which for a "corner" usually means: decided/sequenced, not necessarily fully built):
- a corner we must NOT lock in before it's expensive to change, or drift that already breaks correctness/perf today → the current rung (${current ?? "current"});
- a hotspot/mitigation that must be real before we invite meaningful traffic → "release-candidate";
- headroom work that only matters at genuine public scale → "full-launch".
The harness turns findings that block at or below the current rung into a deploy-blocking red and leaves higher-rung concerns as advisory yellow. Bias toward the higher rungs unless a choice is genuinely a now-or-painful-later corner or an actual present-day breakage.

Return ONLY a single JSON object with this exact shape:
{
  "status": "pass" | "uncertain",
  "summary": "one-line summary of whether the architecture scales cheaply, and the biggest concern",
${FILES_READ_FIELD_SPEC}
  "findings": [
    {
      "title": "short title",
      "severity": "high" | "medium" | "low",
      "blocksAtRung": "${current ?? "ordinary-development"}" | "release-candidate" | "full-launch",
      "kind": "drift" | "unmitigated-hotspot" | "corner" | "premature-complexity" | "docs-gap",
      "evidence": ["what you actually found — the query/service/schema, and the scalability.md claim it contradicts or the risk it realizes"],
      "recommendation": "concrete architectural next step (a seam to add, a decision to make, a choice to avoid locking in)"
    }
  ],
  "reportMarkdown": "Markdown report with sections: The stated scaling plan (as I understand it), What the architecture actually does now, Where it holds up, Where it does NOT (drift / hotspots / corners), Premature complexity (if any), Concerns by milestone rung, Skipped/uncertain scope"
}

Status policy:
- Use "uncertain" if you find any plausible scaling concern worth human triage.
- Use "pass" only if the architecture matches its stated plan and you found no drift, unmitigated hotspot, or hard-to-undo corner after actively looking.
- Do not set "fail" yourself; the harness derives the gating status from each finding's severity AND its blocksAtRung relative to the current milestone rung.

Severity vs. rung — keep these distinct:
- "severity" = how badly the concern hurts at scale (high/medium/low).
- "blocksAtRung" = the earliest rung by which it must be addressed (this is what gates).
A high-severity concern that only needs to be solved before full-launch still stays advisory today; that is correct and expected for most scaling work.
If specs/tech/scalability.md itself is missing, stale, or contradicts the code, that is a "docs-gap" finding worth reporting.`;
}

emit(async () => {
  const inputs = readInputs();
  const params = mergedParams(inputs);
  const milestoneInput = inputs.find((i) => i.kind === "file" && i.as === "milestone");
  const { ladder, current, note } = parseMilestone(milestoneInput?.content);

  const prompt = buildPrompt({ ladder, current, note });
  const promptArtifact = await writeTextArtifact("prompt.md", prompt, "text/markdown", "Cofounder-eye briefing supplied to the exploration-mode reviewer (it reads specs/tech/scalability.md and the actual code/services itself).");
  const model = resolveModel(params, {
    modelEnvVar: "COMMONALITY_VERIFIER_SCALABILITY_MODEL",
    defaultTaskKind: DEFAULT_TASK_KIND
  });

  let llmResult;
  try {
    llmResult = await getLlmResponse(prompt, params, promptArtifact.path, model, {
      fixtureEnvVar: "COMMONALITY_VERIFIER_SCALABILITY_FIXTURE_RESPONSE",
      commandEnvVar: "COMMONALITY_VERIFIER_SCALABILITY_COMMAND",
      explore: true
    });
  } catch (error) {
    return errorResult(`Could not run scalability review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact] });
  }

  const rawResponse = llmResult.text;
  const usage = llmResult.usage;
  const rawArtifact = await writeTextArtifact("raw-response.txt", rawResponse, "text/plain", "Raw LLM response before JSON parsing.");

  let review;
  try {
    review = validateJudgmentResponse(parseJsonObject(rawResponse), { arrayFields: ["findings", "filesRead"] });
  } catch (error) {
    return errorResult(`Could not parse scalability review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact, rawArtifact] });
  }

  const reportArtifact = await writeTextArtifact("report.md", review.reportMarkdown, "text/markdown", "Cofounder-eye review of whether the architecture scales cheaply, judged against specs/tech/scalability.md, with concerns bucketed by milestone rung.");
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
