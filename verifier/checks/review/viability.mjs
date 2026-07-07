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

// PROTOTYPE cofounder-eye leaf: the highest-altitude question the tree doesn't
// otherwise ask — not "do the tests pass?" but "does the system that actually
// exists plausibly accomplish Commonality's real-world goal, and is each core use
// case wired end-to-end into a compelling MVP?" EXPLORATION leaf: the model is
// briefed to founder level, pointed at the README, and given read-only repo
// access so it reads the vision/strategy + MVP docs (ground truth for the goal)
// and the actual code/routes (ground truth for what exists), then judges from
// first principles.
//
// MILESTONE-AWARE GATING: strategic gaps should not block an ordinary-development
// deploy, but SHOULD turn red the moment we claim a rung they don't meet. So each
// finding declares `blocksAtRung` — the lowest milestone ladder rung by which the
// gap must be resolved — and the harness-style status is derived RELATIVE to the
// current rung from milestone.json: fail iff a finding blocks at/below the current
// rung, else uncertain if any findings exist, else pass.

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

// A finding is gating iff the rung it must be fixed by is at or below where we
// currently claim to be. Unknown/absent rung → treat as non-gating (advisory),
// since a strategic worry we can't place shouldn't block a deploy.
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
    role: "skeptical technical cofounder who understands what Commonality is actually for and is on the hook for whether it succeeds",
    purpose: `Judge, from first principles, whether the Commonality system AS IT ACTUALLY EXISTS TODAY plausibly accomplishes its real-world goal — and whether each core use case is implemented END-TO-END into a compelling MVP, not merely present as green unit tests.

This is the cofounder-level question the rest of the test suite deliberately does NOT ask. The other checks confirm the code works, the copy reads well, the contracts are sound. YOUR job is the altitude above that: does the whole thing ADD UP? If a real target user tried to accomplish the things Commonality exists to let them do, would the currently-built system carry them all the way through?

To judge this you must hold TWO ground truths at once:
1. THE GOAL — read the value proposition and intended use cases from the project's own founder/strategy material (the vision-and-strategy docs the README points to) and the MVP scope (specs/product/mvp.md). What is this actually supposed to let people do, and why would they care?
2. WHAT EXISTS — read the current project status (workflow/project-status.md) and enough of the actual app/routes/domains and specs to know what is genuinely wired up versus aspirational. Prefer evidence of end-to-end reachability (a user can actually get from entry to outcome) over the mere existence of a component or a passing unit test.

Then reason about the gap between the two. Be a skeptical cofounder, not a cheerleader: name where the built system would fail to deliver a core use case, where a use case is only half-wired, where the pieces exist but don't compose into something a user could actually complete, and where the value proposition depends on something we have not built.`
  })}
MILESTONE CONTEXT — this is how your findings get gated, so read it carefully.

The project tracks a milestone ladder (the current thoroughness/readiness frontier). ${note ? `Project note: ${note}` : ""}
Ladder: ${rungList}

Strategic gaps are EXPECTED at earlier rungs and must NOT be treated as emergencies that block ordinary development. What matters is: by which rung must each gap be fixed before we could honestly CLAIM that rung? For every finding, set "blocksAtRung" to the LOWEST ladder rung by which the gap must be resolved:
- a gap that already undermines today's work → the current rung (${current ?? "current"});
- a gap that's fine for now but must be closed before we call this a release candidate → "release-candidate";
- a gap that only matters for a full public launch → "full-launch".
The harness turns findings that block at or below the current rung into a deploy-blocking red, and leaves higher-rung gaps as advisory yellow. So an honest "core use case X isn't viable as an MVP yet" should typically block at the rung where we'd claim MVP-readiness, not at ordinary-development.

Look for:
- core use cases that are NOT reachable end-to-end in the built system (present in code, but a user could not actually complete the journey);
- value-proposition dependencies that are unbuilt or only stubbed;
- use cases that technically work but whose UX would not plausibly convince a real user (coordinate with, don't duplicate, the product/UX checks — flag here only when it threatens VIABILITY, not mere polish);
- pieces that exist but don't COMPOSE into the promised whole;
- strategic incoherence (what we're building drifting from what the goal needs).

Return ONLY a single JSON object with this exact shape:
{
  "status": "pass" | "uncertain",
  "summary": "one-line summary of whether the built system plausibly adds up to the goal, and the biggest gap",
${FILES_READ_FIELD_SPEC}
  "findings": [
    {
      "title": "short title",
      "severity": "high" | "medium" | "low",
      "blocksAtRung": "${current ?? "ordinary-development"}" | "release-candidate" | "full-launch",
      "kind": "not-end-to-end" | "unbuilt-dependency" | "doesnt-compose" | "uncompelling" | "strategic-drift",
      "evidence": ["what you actually found — a route, a doc claim vs code reality, a broken journey"],
      "recommendation": "concrete next step that would close the gap"
    }
  ],
  "reportMarkdown": "Markdown report with sections: The goal (as I understand it), What actually exists, Where it adds up, Where it does NOT yet add up (the gaps), Gaps by milestone rung, Skipped/uncertain scope"
}

Status policy:
- Use "uncertain" if you find any plausible viability gap worth human triage.
- Use "pass" only if the built system plausibly accomplishes the goal end-to-end for its core use cases and you have no material gap after actively looking.
- Do not set "fail" yourself; the harness derives the gating status from each finding's severity AND its blocksAtRung relative to the current milestone rung.

Severity vs. rung — keep these distinct:
- "severity" = how badly the gap hurts the goal (high/medium/low).
- "blocksAtRung" = the earliest rung by which it must be fixed (this is what gates).
A high-severity gap that only needs to be closed before full-launch still stays advisory today; that is correct.`;
}

emit(async () => {
  const inputs = readInputs();
  const params = mergedParams(inputs);
  const milestoneInput = inputs.find((i) => i.kind === "file" && i.as === "milestone");
  const { ladder, current, note } = parseMilestone(milestoneInput?.content);

  const prompt = buildPrompt({ ladder, current, note });
  const promptArtifact = await writeTextArtifact("prompt.md", prompt, "text/markdown", "Cofounder-eye briefing supplied to the exploration-mode reviewer (it reads the vision/MVP docs and the actual code itself).");
  const model = resolveModel(params, {
    modelEnvVar: "COMMONALITY_VERIFIER_VIABILITY_MODEL",
    defaultTaskKind: DEFAULT_TASK_KIND
  });

  let llmResult;
  try {
    llmResult = await getLlmResponse(prompt, params, promptArtifact.path, model, {
      fixtureEnvVar: "COMMONALITY_VERIFIER_VIABILITY_FIXTURE_RESPONSE",
      commandEnvVar: "COMMONALITY_VERIFIER_VIABILITY_COMMAND",
      explore: true
    });
  } catch (error) {
    return errorResult(`Could not run viability review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact] });
  }

  const rawResponse = llmResult.text;
  const usage = llmResult.usage;
  const rawArtifact = await writeTextArtifact("raw-response.txt", rawResponse, "text/plain", "Raw LLM response before JSON parsing.");

  let review;
  try {
    review = validateJudgmentResponse(parseJsonObject(rawResponse), { arrayFields: ["findings", "filesRead"] });
  } catch (error) {
    return errorResult(`Could not parse viability review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact, rawArtifact] });
  }

  const reportArtifact = await writeTextArtifact("report.md", review.reportMarkdown, "text/markdown", "Cofounder-eye review of whether the built system plausibly accomplishes the goal, with gaps bucketed by milestone rung.");
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
