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

// PROTOTYPE cofounder-eye leaf (sibling to review.viability / review.scalability):
// the "what has grown too complicated to justify its value?" question — the
// inverse of the feature/viability checks. Those ask what's MISSING; this asks
// what should be CUT or COLLAPSED. Ground truth is the product's actual needs
// (MVP scope + value prop): complexity is only worth carrying if it buys value
// the product genuinely needs. The model briefs itself, then reads the code/
// architecture looking for complexity that outweighs its payoff.
//
// Unlike the other siblings there is no single "simplicity spec" doc; the bar is
// "essential vs. incidental complexity relative to what the MVP requires." The
// architecture review under workflow/reviews/ is useful prior context.
//
// MILESTONE-AWARE GATING (shared machinery): simplification is mostly ongoing
// hygiene, not a deploy gate, so findings bias toward advisory. Each finding
// declares `blocksAtRung`; status is derived relative to milestone.json's current
// rung: fail iff a finding blocks at/below current, else uncertain if any
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
    role: "skeptical staff engineer / technical cofounder with a strong bias toward simplicity, who has to live in this codebase every day",
    purpose: `Judge where the Commonality system has grown MORE COMPLICATED than the value it delivers justifies — and what could be cut, collapsed, or simplified without losing anything the product actually needs.

This is the INVERSE of the feature and viability checks. They ask "what is missing?" You ask "what is here that shouldn't be, or is more elaborate than it needs to be?" Unnecessary complexity is a real cost: it slows every future change, hides bugs, and raises the barrier for both humans and AI helpers to work in the code. Catching it early is cheap; letting it ossify is not.

The bar is ESSENTIAL vs. INCIDENTAL complexity relative to what the product genuinely requires. To judge that you must first understand what the system actually needs to do — read the MVP scope (specs/product/mvp.md) and enough of the value-prop docs to know which capabilities are load-bearing versus nice-to-have. Complexity is justified only when it buys value the product truly needs; complexity in service of a capability the MVP doesn't need, or complexity far out of proportion to a small payoff, is a finding. The architecture reviews under workflow/reviews/ are useful prior context for where complexity already accumulated.

Then read the code and architecture and look for:
- OVER-ABSTRACTION — layers/indirection/config/generality whose flexibility is never actually used (one implementation behind a plugin interface, a framework for a single case);
- REDUNDANT MECHANISM — two or more ways to do the same thing that should be one (duplicated concepts across packages, parallel code paths, DRY violations at the architecture level, not just copied lines);
- SPECULATIVE COMPLEXITY — machinery built for a future/scale/use case that may never arrive (YAGNI), carrying cost now for hypothetical payoff;
- INCIDENTAL COMPLEXITY — accidental intricacy (tangled dependencies, leaky boundaries, an awkward data model) that makes simple changes hard for no essential reason;
- COMPLEXITY WITHOUT AN OWNER-VISIBLE PAYOFF — a subsystem elaborate out of proportion to the value the product gets from it, a candidate to cut entirely.

Be concrete and propose the simplification. Do NOT flag essential complexity (things that are irreducibly hard because the problem is hard) — say so when you decide something's complexity is earned.`
  })}
MILESTONE CONTEXT — this is how your findings get gated, so read it carefully.

The project tracks a milestone ladder (the current thoroughness/readiness frontier). ${note ? `Project note: ${note}` : ""}
Ladder: ${rungList}

Simplification is mostly ONGOING HYGIENE, not a release gate — carrying some extra complexity does not stop a deploy. So bias toward advisory. For every finding set "blocksAtRung" to the LOWEST ladder rung by which the simplification should happen:
- complexity that is ACTIVELY causing bugs, or so entangled it's materially slowing current development / blocking the work at hand → the current rung (${current ?? "current"});
- complexity worth collapsing before we harden for a release, or before more code piles onto the wrong abstraction → "release-candidate";
- cleanup that would be nice but is genuinely fine to carry for now → "full-launch".
The harness turns findings that block at or below the current rung into a deploy-blocking red and leaves the rest as advisory yellow. Reserve the current rung for complexity that is genuinely hurting NOW; most simplification opportunities are advisory.

Return ONLY a single JSON object with this exact shape:
{
  "status": "pass" | "uncertain",
  "summary": "one-line summary of whether complexity is proportionate to value, and the biggest thing to cut/collapse",
${FILES_READ_FIELD_SPEC}
  "findings": [
    {
      "title": "short title",
      "severity": "high" | "medium" | "low",
      "blocksAtRung": "${current ?? "ordinary-development"}" | "release-candidate" | "full-launch",
      "kind": "over-abstraction" | "redundant-mechanism" | "speculative" | "incidental" | "unjustified-subsystem" | "docs-gap",
      "evidence": ["what you actually found — the abstraction/duplication/subsystem, and why its complexity outweighs the value the product needs from it"],
      "recommendation": "concrete simplification (collapse X into Y, delete the unused generality, unify the two paths, cut the subsystem)"
    }
  ],
  "reportMarkdown": "Markdown report with sections: What the product actually needs, Where complexity is earned (essential), Where it is NOT earned (over-abstraction / redundancy / speculation / incidental), Biggest simplification opportunities, Opportunities by milestone rung, Skipped/uncertain scope"
}

Status policy:
- Use "uncertain" if you find any plausible unjustified complexity worth human triage.
- Use "pass" only if the system's complexity is proportionate to what the product needs and you found nothing worth cutting after actively looking.
- Do not set "fail" yourself; the harness derives the gating status from each finding's severity AND its blocksAtRung relative to the current milestone rung.

Severity vs. rung — keep these distinct:
- "severity" = how much the unnecessary complexity costs (dev velocity, bug surface, comprehension).
- "blocksAtRung" = the earliest rung by which it should be simplified (this is what gates).
A high-cost simplification that is nonetheless safe to defer still stays advisory today; that is correct, and most simplification is advisory.`;
}

emit(async () => {
  const inputs = readInputs();
  const params = mergedParams(inputs);
  const milestoneInput = inputs.find((i) => i.kind === "file" && i.as === "milestone");
  const { ladder, current, note } = parseMilestone(milestoneInput?.content);

  const prompt = buildPrompt({ ladder, current, note });
  const promptArtifact = await writeTextArtifact("prompt.md", prompt, "text/markdown", "Cofounder-eye briefing supplied to the exploration-mode reviewer (it reads the MVP/value-prop docs and the actual code/architecture itself).");
  const model = resolveModel(params, {
    modelEnvVar: "COMMONALITY_VERIFIER_SIMPLICITY_MODEL",
    defaultTaskKind: DEFAULT_TASK_KIND
  });

  let llmResult;
  try {
    llmResult = await getLlmResponse(prompt, params, promptArtifact.path, model, {
      fixtureEnvVar: "COMMONALITY_VERIFIER_SIMPLICITY_FIXTURE_RESPONSE",
      commandEnvVar: "COMMONALITY_VERIFIER_SIMPLICITY_COMMAND",
      explore: true
    });
  } catch (error) {
    return errorResult(`Could not run simplicity review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact] });
  }

  const rawResponse = llmResult.text;
  const usage = llmResult.usage;
  const rawArtifact = await writeTextArtifact("raw-response.txt", rawResponse, "text/plain", "Raw LLM response before JSON parsing.");

  let review;
  try {
    review = validateJudgmentResponse(parseJsonObject(rawResponse), { arrayFields: ["findings", "filesRead"] });
  } catch (error) {
    return errorResult(`Could not parse simplicity review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact, rawArtifact] });
  }

  const reportArtifact = await writeTextArtifact("report.md", review.reportMarkdown, "text/markdown", "Cofounder-eye review of where complexity outweighs the value the product needs, with simplification opportunities bucketed by milestone rung.");
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
