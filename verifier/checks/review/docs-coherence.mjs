import { readFile, stat } from "node:fs/promises";
import { emit, errorResult, pass, readInputs, truncate, uncertain, workspacePath, writeTextArtifact } from "../lib/result.mjs";
import { getLlmResponse, mergedParams, parseJsonObject, resolveModel, validateJudgmentResponse } from "../lib/llm-judgment.mjs";

// Standing qualitative-judgment leaf (item 3 in PLAN.md): rather than attest that
// a human wrote a docs review, this check asks a model to form the opinion itself
// over the product/docs surface and flag incoherence, contradictions, and stale
// instructions. Advisory like meta.llm-check-review: status is mapped
// deterministically from the model's structured verdict (pass | uncertain, never
// fail), so a plausible coherence gap surfaces for triage without paging root.

// The documentation surface a newcomer or operator reads to understand the
// product. Kept bounded and explicit so the prompt stays cheap and reviewable.
const DEFAULT_INPUT_FILES = [
  "../README.md",
  "../AGENTS.md",
  "../docs/dev/architecture.md",
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
  "../workflow/testing/README.md",
  "../workflow/testing/manual-tests/README.md",
  "../specs/product/ui-domains.md",
  "../specs/tech/ui-domains.md",
  "../specs/tech/subsystems/subjectiv/README.md",
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
- Do not use "fail"; qualitative doc judgments are advisory and must not page directly.
- If a file is missing, judge whether its absence itself breaks coherence (e.g. another doc references it).

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

  if (review.status === "pass") return pass(review.summary, { findings, artifacts });
  return uncertain(review.summary, { findings, artifacts });
});
