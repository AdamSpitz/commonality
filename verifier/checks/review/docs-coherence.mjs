import { readFile, stat } from "node:fs/promises";
import { emit, errorResult, fail, pass, readInputs, truncate, uncertain, workspacePath, writeTextArtifact } from "../lib/result.mjs";
import { getLlmResponse, mergedParams, parseJsonObject, resolveModel, statusFromFindings, validateJudgmentResponse } from "../lib/llm-judgment.mjs";

// Standing qualitative-judgment leaf (item 3 in PLAN.md): rather than attest that
// a human wrote a docs review, this check asks a model to form the opinion itself
// over the product/docs surface and flag incoherence, contradictions, and stale
// instructions. Gating leaf in facet.docs: status is derived deterministically
// from the structured findings' severities (statusFromFindings) — any "high"
// finding turns it red, lesser findings make it uncertain — so the model can
// neither talk a gap into a pass nor downgrade a high-severity finding.

// The documentation surface a newcomer or operator reads to understand the
// product. Kept bounded and explicit so the prompt stays cheap and reviewable.
const DEFAULT_INPUT_FILES = [
  "../README.md",
  "../CONTINUITY.md",
  "../TODO.md",
  "../workflow/task-tiers.md",
  "../inbox.md",
  "README.md",
  "../workflow/project-status.md",
  "../specs/user-docs.md",
  "../workflow/reviews/README.md",
  "../workflow/branching.md",
  "../testnet-prep.md",
  "../AGENTS.md",
  "../docs/dev/architecture.md",
  "../hardhat/README.md",
  "../sdk/README.md",
  "../indexer/README.md",
  "../integration-tests/README.md",
  "../fake-data-generation/README.md",
  "../attester-core/README.md",
  "../implication-attester/README.md",
  "../content-attester/README.md",
  "../finder-core/README.md",
  "../implication-finder/README.md",
  "../content-finder/README.md",
  "../nudger-core/README.md",
  "../implication-graph-nudger/README.md",
  "../bridge-creator/README.md",
  "../explorer-curator/README.md",
  "../beat-agent/README.md",
  "../service-host/README.md",
  "../platform-api-service/README.md",
  "../ui/test-plan.md",
  "../docs/end-user/tldr-for-llms.md",
  "../docs/founder/christian-pitch.md",
  "../ui/README.md",
  "../workflow/roles/README.md",
  "../workflow/roles/developer.md",
  "../workflow/roles/end-user.md",
  "../workflow/roles/founder.md",
  "../workflow/roles/product-manager.md",
  "../workflow/roles/tech-lead.md",
  "../workflow/local-development.md",
  "../workflow/build.md",
  "../workflow/deployment.md",
  "testing-plan.md",
  "manual-validation-plan.md",
  "PLAN.md",
  "../specs/README.md",
  "../specs/product/ui-domains.md",
  "../specs/product/ai-assistance.md",
  "../specs/tech/README.md",
  "../specs/tech/ui-domains.md",
  "../specs/tech/indexer/README.md",
  "../specs/tech/service-bundling.md",
  "../specs/tech/subsystems/subjectiv/README.md",
  "../specs/tech/subsystems/conceptspace/README.md",
  "../specs/tech/subsystems/lazyGiving/README.md",
  "../specs/tech/subsystems/nudger/README.md",
  "../specs/tech/subsystems/content-funding/canonicalization.md",
  "../specs/tech/subsystems/content-funding/channel-claiming.md",
  "../specs/tech/subsystems/content-funding/content-registry.md",
  "../specs/tech/subsystems/content-funding/content-attesters.md",
  "../specs/tech/subsystems/conceptspace/implication-attester-ai.md",
  "../specs/tech/subsystems/fundingportals/README.md",
  "../specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md",
  "../specs/tech/subsystems/content-funding/platform-api-service.md",
  "../specs/tech/subsystems/conceptspace/explorer.md",
  "../workflow/reviews/smart-contract-audit-2026-05-07.md",
  "../docs/end-user/tally/statements-and-implication-graph.md",
  "../docs/end-user/shared/key-ideas/README.md",
  "../docs/end-user/commonality/vision-and-strategy/README.md",
  "../.env.example",
  "../ui/.env.example"
];

// A docs-coherence judgment is a "clear-communication" task; route by kind so the
// check tracks the model-routing table rather than pinning a model string.
const DEFAULT_TASK_KIND = "clear-communication";

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectDocInputs(params) {
  const maxFileChars = Number(params.maxFileChars ?? 60000);
  const files = [];
  for (const relativePath of params.inputFiles ?? DEFAULT_INPUT_FILES) {
    const absolutePath = workspacePath(relativePath);
    if (await exists(absolutePath)) {
      files.push({ relativePath, content: truncate(await readFile(absolutePath, "utf8"), maxFileChars) });
    } else {
      files.push({ relativePath, missing: true });
    }
  }
  return files;
}

function buildPrompt(files) {
  const renderedFiles = files.map((file) => {
    if (file.missing) return `## ${file.relativePath}\n\n<MISSING>`;
    return `## ${file.relativePath}\n\n${file.content}`;
  }).join("\n\n---\n\n");

  return `You are a skeptical technical editor reviewing Commonality's documentation surface for coherence.

Your job is to judge whether these docs make sense *together* as a description of one product. Do not praise; find problems. Read as a newcomer who must act on these instructions.

Look for:
- internal contradictions (two docs describing the same thing differently);
- stale instructions (commands, paths, env vars, or flows that no longer match what other docs describe);
- conceptual incoherence (terms used inconsistently, undefined jargon, a value proposition that shifts between documents);
- broken or dangling references (a doc points at a file/section/concept that is missing here);
- instructions a newcomer could not actually follow to completion.

Return ONLY a single JSON object with this exact shape:
{
  "status": "pass" | "uncertain",
  "summary": "one-line summary",
  "findings": [
    {
      "title": "short title",
      "severity": "high" | "medium" | "low",
      "kind": "contradiction" | "stale" | "incoherence" | "broken-reference" | "unfollowable",
      "evidence": ["specific doc/section/quote evidence"],
      "recommendation": "concrete doc fix"
    }
  ],
  "reportMarkdown": "Markdown report with sections: Scope reviewed, Main findings, Suggested fixes, Skipped/uncertain scope"
}

Status policy:
- Use "uncertain" if you find any plausible coherence problem needing human triage.
- Use "pass" only if the supplied docs are coherent and you have no material findings after actively reviewing them.
- Do not set "fail" yourself; the harness derives the gating status from finding severities.
- If a file is missing, judge whether its absence itself breaks coherence (e.g. another doc references it).

Severity calibration (the harness turns any "high" finding into a deploy-blocking red, "medium"/"low" into advisory yellow):
- "high": a contradiction or broken instruction that would actively mislead a newcomer or block them from completing a documented flow.
- "medium": real incoherence or staleness that causes confusion but has a workaround.
- "low": polish, wording, or minor drift.

Path convention for the supplied surface: paths beginning with \`../\` are relative to the repository root from this verifier workspace; paths without \`../\` are files inside \`verifier/\` (for example, \`testing-plan.md\` means \`verifier/testing-plan.md\`). Treat \`CONTINUITY.md\` as historical change notes, not canonical current instructions, unless a current navigation page points readers to a stale entry as current guidance.

Supplied documentation surface follows.

${renderedFiles}`;
}

emit(async () => {
  const params = mergedParams(readInputs());
  const files = await collectDocInputs(params);
  const prompt = buildPrompt(files);
  const promptArtifact = await writeTextArtifact("prompt.md", prompt, "text/markdown", "Prompt and bounded docs surface supplied to the LLM editor.");
  const model = resolveModel(params, {
    modelEnvVar: "COMMONALITY_VERIFIER_DOCS_COHERENCE_MODEL",
    defaultTaskKind: DEFAULT_TASK_KIND
  });

  let rawResponse;
  try {
    rawResponse = await getLlmResponse(prompt, params, promptArtifact.path, model, {
      fixtureEnvVar: "COMMONALITY_VERIFIER_DOCS_COHERENCE_FIXTURE_RESPONSE",
      commandEnvVar: "COMMONALITY_VERIFIER_DOCS_COHERENCE_COMMAND"
    });
  } catch (error) {
    return errorResult(`Could not run docs-coherence review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact] });
  }

  const rawArtifact = await writeTextArtifact("raw-response.txt", rawResponse, "text/plain", "Raw LLM response before JSON parsing.");

  let review;
  try {
    review = validateJudgmentResponse(parseJsonObject(rawResponse), { arrayFields: ["findings"] });
  } catch (error) {
    return errorResult(`Could not parse docs-coherence review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact, rawArtifact] });
  }

  const reportArtifact = await writeTextArtifact("report.md", review.reportMarkdown, "text/markdown", "LLM coherence review of the product documentation surface.");
  const findings = {
    reviewedFiles: files.map((file) => ({ path: file.relativePath, missing: Boolean(file.missing) })),
    findings: review.findings ?? [],
    model: model ?? "command-default"
  };
  const artifacts = [promptArtifact, rawArtifact, reportArtifact];

  const status = statusFromFindings(review.findings);
  if (status === "fail") return fail(review.summary, { findings, artifacts });
  if (status === "pass") return pass(review.summary, { findings, artifacts });
  return uncertain(review.summary, { findings, artifacts });
});
