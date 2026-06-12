import { readFile, stat } from "node:fs/promises";
import { emit, errorResult, fail, pass, readInputs, truncate, uncertain, workspacePath, writeTextArtifact } from "../lib/result.mjs";
import { getLlmResponse, mergedParams, parseJsonObject, resolveModel, statusFromFindings, validateJudgmentResponse } from "../lib/llm-judgment.mjs";

// Standing qualitative-judgment leaf (item 3 in PLAN.md): given a target workflow,
// judge whether the UI actually exposes a clear, completable path through it.
// The coverage.domains inventory is the surface enumerator (which domains exist),
// and each domain's manifest (routes + navigation) plus its landing page is the
// bounded UI surface the model reads to trace the path. Advisory like its sibling
// review leaves: status maps deterministically (pass | uncertain, never fail), so
// the model enriches the summary but cannot talk a dead-end into a pass.

// The domain inventory used as the surface enumerator, so the prompt knows the
// full set of product domains the workflow might traverse.
const DOMAINS_INVENTORY = "coverage/domains.json";

// A representative default workflow so the check runs without configuration. A
// caller can override `targetWorkflow` (and its surfaceFiles) to point the leaf at
// any other domain/goal. Surface files should include the home domain entry point
// plus the bounded components needed to trace the target workflow across domains.
const DEFAULT_TARGET_WORKFLOW = {
  domain: "alignment",
  goal: "A newcomer donor lands on Aligning and wants to discover a cause, understand it, and complete a funding/alignment-attestation action — without prior knowledge of the product.",
  surfaceFiles: [
    "../ui/src/domains/alignment/manifest.tsx",
    "../ui/src/domains/alignment/LandingPage.tsx",
    "../ui/src/conceptspace/pages/ExplorerPage.tsx",
    "../ui/src/fundingportals/pages/StatementFundingPortalPage.tsx",
    "../ui/src/fundingportals/components/FundingPortalSummary.tsx",
    "../ui/src/fundingportals/components/AlignedProjectCard.tsx",
    "../ui/src/lazy-giving/pages/ProjectDetailPage.tsx",
    "../ui/src/fundingportals/components/AlignmentAttestationsSection.tsx"
  ]
};

// A workflow-clarity judgment is a "big-picture-thinking" task; route by kind so
// the check tracks the model-routing table rather than pinning a model string.
const DEFAULT_TASK_KIND = "big-picture-thinking";

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readWorkspaceFile(relativePath, maxFileChars) {
  const absolutePath = workspacePath(relativePath);
  if (await exists(absolutePath)) {
    return { relativePath, content: truncate(await readFile(absolutePath, "utf8"), maxFileChars) };
  }
  return { relativePath, missing: true };
}

function renderFiles(files) {
  return files.map((file) => {
    if (file.missing) return `## ${file.relativePath}\n\n<MISSING>`;
    return `## ${file.relativePath}\n\n${file.content}`;
  }).join("\n\n---\n\n");
}

function buildPrompt(workflow, inventoryFile, surfaceFiles) {
  return `You are a skeptical UX reviewer judging whether Commonality's UI exposes a clear, completable path through a target workflow.

The TARGET WORKFLOW is:
- Home domain: ${workflow.domain}
- Goal: ${workflow.goal}

Trace the path a user would actually take through the supplied UI surface (domain routes and navigation, plus the landing page's copy and calls-to-action). Judge whether someone with the stated goal could get from the entry point to completion without guessing, dead-ending, or leaving the product. Do not praise; find where the path is unclear, broken, or incomplete.

Look for:
- dead ends (a step the workflow needs has no route, link, or CTA reachable from the surface shown);
- missing steps (the path skips a prerequisite, or there is no visible way to start or finish);
- ambiguous navigation (CTAs or nav labels that don't clearly map to the next step, or compete/confuse);
- unexplained cross-domain hops (the path sends the user to another domain — e.g. LazyGiving, Tally — without making that hand-off clear);
- onboarding gaps (a newcomer can't tell what to do first, or what the workflow is even for).

Use the domain inventory as the map of which domains exist; if the path depends on a domain or route not present in the supplied surface, say so rather than assuming it works.

Return ONLY a single JSON object with this exact shape:
{
  "status": "pass" | "uncertain",
  "summary": "one-line summary",
  "findings": [
    {
      "title": "short title",
      "severity": "high" | "medium" | "low",
      "kind": "dead-end" | "missing-step" | "ambiguous-nav" | "cross-domain" | "onboarding",
      "evidence": ["specific route/nav/CTA and where it appears"],
      "recommendation": "concrete UI fix"
    }
  ],
  "reportMarkdown": "Markdown report with sections: Workflow reviewed, Traced path, Main findings, Suggested fixes, Skipped/uncertain scope"
}

Status policy:
- Use "uncertain" if the path has any plausible gap, dead end, or ambiguity worth human triage.
- Use "pass" only if a user with the stated goal could clearly complete the workflow from the supplied surface, with no material findings.
- Do not set "fail" yourself; the harness derives the gating status from finding severities.

Severity calibration (the harness turns any "high" finding into a deploy-blocking red, "medium"/"low" into advisory yellow):
- "high": a dead end, missing step, or unexplained hop that would block a user with the stated goal from completing the workflow.
- "medium": ambiguous navigation or an onboarding gap that confuses but is recoverable.
- "low": polish or minor wording.

The DOMAIN INVENTORY (surface enumerator) follows.

${renderFiles([inventoryFile])}

============================================================

The UI SURFACE for the target workflow follows.

${renderFiles(surfaceFiles)}`;
}

emit(async () => {
  const params = mergedParams(readInputs());
  const maxFileChars = Number(params.maxFileChars ?? 60000);
  const workflow = params.targetWorkflow ?? DEFAULT_TARGET_WORKFLOW;
  const surfacePaths = workflow.surfaceFiles ?? DEFAULT_TARGET_WORKFLOW.surfaceFiles;

  const inventoryFile = await readWorkspaceFile(DOMAINS_INVENTORY, maxFileChars);
  const surfaceFiles = [];
  for (const relativePath of surfacePaths) {
    surfaceFiles.push(await readWorkspaceFile(relativePath, maxFileChars));
  }

  const prompt = buildPrompt(workflow, inventoryFile, surfaceFiles);
  const promptArtifact = await writeTextArtifact("prompt.md", prompt, "text/markdown", "Prompt, domain inventory, and bounded UI surface supplied to the LLM UX reviewer.");
  const model = resolveModel(params, {
    modelEnvVar: "COMMONALITY_VERIFIER_WORKFLOW_CLARITY_MODEL",
    defaultTaskKind: DEFAULT_TASK_KIND
  });

  let rawResponse;
  try {
    rawResponse = await getLlmResponse(prompt, params, promptArtifact.path, model, {
      fixtureEnvVar: "COMMONALITY_VERIFIER_WORKFLOW_CLARITY_FIXTURE_RESPONSE",
      commandEnvVar: "COMMONALITY_VERIFIER_WORKFLOW_CLARITY_COMMAND"
    });
  } catch (error) {
    return errorResult(`Could not run workflow-clarity review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact] });
  }

  const rawArtifact = await writeTextArtifact("raw-response.txt", rawResponse, "text/plain", "Raw LLM response before JSON parsing.");

  let review;
  try {
    review = validateJudgmentResponse(parseJsonObject(rawResponse), { arrayFields: ["findings"] });
  } catch (error) {
    return errorResult(`Could not parse workflow-clarity review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact, rawArtifact] });
  }

  const reportArtifact = await writeTextArtifact("report.md", review.reportMarkdown, "text/markdown", "LLM review of whether the UI exposes a clear, completable path through the target workflow.");
  const findings = {
    workflow: { domain: workflow.domain, goal: workflow.goal },
    surfaceFiles: surfaceFiles.map((file) => ({ path: file.relativePath, missing: Boolean(file.missing) })),
    inventoryMissing: Boolean(inventoryFile.missing),
    findings: review.findings ?? [],
    model: model ?? "command-default"
  };
  const artifacts = [promptArtifact, rawArtifact, reportArtifact];

  const status = statusFromFindings(review.findings);
  if (status === "fail") return fail(review.summary, { findings, artifacts });
  if (status === "pass") return pass(review.summary, { findings, artifacts });
  return uncertain(review.summary, { findings, artifacts });
});
