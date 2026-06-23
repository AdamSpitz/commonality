import { emit, errorResult, fail, pass, readInputs, uncertain, writeTextArtifact } from "../lib/result.mjs";
import {
  explorationBriefing,
  FILES_READ_FIELD_SPEC,
  getLlmResponse,
  mergedParams,
  parseJsonObject,
  resolveModel,
  statusFromFindings,
  validateJudgmentResponse,
  writeFilesReadArtifact
} from "../lib/llm-judgment.mjs";

// Standing qualitative-judgment leaf: given a target workflow, judge whether the
// UI actually exposes a clear, completable path through it. This is an EXPLORATION
// leaf: instead of pre-stuffing a bounded set of UI files into the prompt, the
// model is briefed on its purpose, pointed at the README, and given read-only
// repo access so it can read the product/tech docs and the relevant UI source
// itself — the way a briefed reviewer would. Status maps deterministically from
// finding severities (statusFromFindings), so the model enriches the report but
// cannot talk a dead-end into a pass.

// The domain inventory is the surface enumerator (which product domains exist).
const DOMAINS_INVENTORY = "verifier/coverage/domains.json";

// A representative default workflow so the check runs without configuration. A
// caller overrides `targetWorkflow` to point the leaf at any other domain/goal.
// `surfaceFiles` are starting-point hints the reviewer should open first; it is
// free to read more widely (or elsewhere) as the trace requires.
const DEFAULT_TARGET_WORKFLOW = {
  domain: "alignment",
  goal: "A newcomer donor lands on Aligning and wants to discover a cause, understand it, and complete a funding/alignment-attestation action — without prior knowledge of the product.",
  surfaceFiles: [
    "ui/src/domains/alignment/manifest.tsx",
    "ui/src/domains/alignment/LandingPage.tsx",
    "ui/src/conceptspace/pages/ExplorerPage.tsx",
    "ui/src/fundingportals/pages/StatementFundingPortalPage.tsx",
    "ui/src/fundingportals/components/FundingPortalSummary.tsx",
    "ui/src/fundingportals/components/AlignedProjectCard.tsx",
    "ui/src/lazy-giving/pages/ProjectDetailPage.tsx",
    "ui/src/fundingportals/components/AlignmentAttestationsSection.tsx"
  ]
};

// A workflow-clarity judgment is a "big-picture-thinking" task; route by kind so
// the check tracks the model-routing table rather than pinning a model string.
const DEFAULT_TASK_KIND = "big-picture-thinking";

// def.json surfaceFiles historically used a `../`-from-workspace prefix;
// exploration runs from the repo root, so normalize either form to repo-relative.
function toRepoRelative(p) {
  return p.replace(/^(\.\.\/)+/, "").replace(/^\.\//, "");
}

function buildPrompt(workflow) {
  const surfaceHints = (workflow.surfaceFiles ?? []).map(toRepoRelative);
  return `${explorationBriefing({
    role: "skeptical UX reviewer who understands the product's goals",
    purpose: `Judge whether Commonality's UI exposes a clear, completable path through this target workflow:
- Home domain: ${workflow.domain}
- Goal: ${workflow.goal}

Trace the path a user with that goal would actually take through the real UI source. Judge whether they could get from the entry point to completion without guessing, dead-ending, or leaving the product. Understand what the workflow is FOR (read the relevant product/tech docs first) before judging the UI that implements it.`
  })}
Where to look:
- The product domains are enumerated in \`${DOMAINS_INVENTORY}\`; the live route/navigation manifests and pages live under \`ui/src/domains/\` and the feature directories under \`ui/src/\`.
- Suggested starting points for THIS workflow (open these first, then follow the trace wherever it leads — read more widely if needed):
${surfaceHints.length > 0 ? surfaceHints.map((p) => `  - \`${p}\``).join("\n") : "  - (none specified — locate the domain's manifest and landing page yourself)"}

Do not praise; find where the path is unclear, broken, or incomplete. Look for:
- dead ends (a step the workflow needs has no route, link, or CTA);
- missing steps (the path skips a prerequisite, or there is no visible way to start or finish);
- ambiguous navigation (CTAs or nav labels that don't clearly map to the next step, or compete/confuse);
- unexplained cross-domain hops (the path sends the user to another domain without making the hand-off clear);
- onboarding gaps (a newcomer can't tell what to do first, or what the workflow is even for).

Return ONLY a single JSON object with this exact shape:
{
  "status": "pass" | "uncertain",
  "summary": "one-line summary",
${FILES_READ_FIELD_SPEC}
  "findings": [
    {
      "title": "short title",
      "severity": "high" | "medium" | "low",
      "kind": "dead-end" | "missing-step" | "ambiguous-nav" | "cross-domain" | "onboarding" | "docs-gap",
      "evidence": ["specific route/nav/CTA/file and where it appears"],
      "recommendation": "concrete UI (or docs) fix"
    }
  ],
  "reportMarkdown": "Markdown report with sections: Workflow reviewed, How I briefed myself, Traced path, Main findings, Suggested fixes, Skipped/uncertain scope"
}

Status policy:
- Use "uncertain" if the path has any plausible gap, dead end, or ambiguity worth human triage.
- Use "pass" only if a user with the stated goal could clearly complete the workflow, with no material findings.
- Do not set "fail" yourself; the harness derives the gating status from finding severities.

Severity calibration (the harness turns any "high" finding into a deploy-blocking red, "medium"/"low" into advisory yellow):
- "high": a dead end, missing step, or unexplained hop that would block a user with the stated goal from completing the workflow.
- "medium": ambiguous navigation or an onboarding gap that confuses but is recoverable.
- "low": polish or minor wording. Use "docs-gap" at severity at most "medium" unless missing docs actually block the trace.`;
}

emit(async () => {
  const params = mergedParams(readInputs());
  const workflow = params.targetWorkflow ?? DEFAULT_TARGET_WORKFLOW;

  const prompt = buildPrompt(workflow);
  const promptArtifact = await writeTextArtifact("prompt.md", prompt, "text/markdown", "Role/purpose briefing supplied to the exploration-mode UX reviewer (the model reads the docs and UI source itself).");
  const model = resolveModel(params, {
    modelEnvVar: "COMMONALITY_VERIFIER_WORKFLOW_CLARITY_MODEL",
    defaultTaskKind: DEFAULT_TASK_KIND
  });

  let rawResponse;
  try {
    rawResponse = await getLlmResponse(prompt, params, promptArtifact.path, model, {
      fixtureEnvVar: "COMMONALITY_VERIFIER_WORKFLOW_CLARITY_FIXTURE_RESPONSE",
      commandEnvVar: "COMMONALITY_VERIFIER_WORKFLOW_CLARITY_COMMAND",
      explore: true
    });
  } catch (error) {
    return errorResult(`Could not run workflow-clarity review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact] });
  }

  const rawArtifact = await writeTextArtifact("raw-response.txt", rawResponse, "text/plain", "Raw LLM response before JSON parsing.");

  let review;
  try {
    review = validateJudgmentResponse(parseJsonObject(rawResponse), { arrayFields: ["findings", "filesRead"] });
  } catch (error) {
    return errorResult(`Could not parse workflow-clarity review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact, rawArtifact] });
  }

  const reportArtifact = await writeTextArtifact("report.md", review.reportMarkdown, "text/markdown", "LLM review of whether the UI exposes a clear, completable path through the target workflow.");
  const filesReadArtifact = await writeFilesReadArtifact(review.filesRead);
  const findings = {
    workflow: { domain: workflow.domain, goal: workflow.goal },
    filesRead: review.filesRead ?? [],
    findings: review.findings ?? [],
    model: model ?? "command-default"
  };
  const artifacts = [promptArtifact, rawArtifact, reportArtifact, filesReadArtifact];

  const status = statusFromFindings(review.findings);
  if (status === "fail") return fail(review.summary, { findings, artifacts });
  if (status === "pass") return pass(review.summary, { findings, artifacts });
  return uncertain(review.summary, { findings, artifacts });
});
