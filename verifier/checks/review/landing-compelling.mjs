import { readFile, stat } from "node:fs/promises";
import { emit, errorResult, fail, pass, readInputs, truncate, uncertain, workspacePath, writeTextArtifact } from "../lib/result.mjs";
import { getLlmResponse, mergedParams, parseJsonObject, resolveModel, statusFromFindings, validateJudgmentResponse } from "../lib/llm-judgment.mjs";

// Standing qualitative-judgment leaf (item 3 in PLAN.md): rather than attest that
// a human reviewed the marketing copy, this check asks a model to form the opinion
// itself — does the landing/marketing copy actually land the product's value
// proposition, and where is it unconvincing or misaligned with what we built?
// Advisory like meta.llm-check-review and review.docs-coherence: status maps
// deterministically (pass | uncertain, never fail), so the model enriches the
// summary but cannot talk a weak-copy finding into a pass.

// The copy under review: the landing-page prose and public pitches a prospective
// user or backer actually reads. Landing pages live in TSX, so we feed the source
// and let the model read the copy strings out of it. Kept bounded and explicit.
const DEFAULT_COPY_FILES = [
  "../docs/end-user/common-sense-majority/elevator-pitch.md",
  "../docs/end-user/tldr-for-llms.md",
  "../docs/founder/csm/pitching-reference.md",
  "../ui/src/domains/commonality/LandingPage.tsx",
  "../ui/src/domains/common-sense-majority/LandingPage.tsx"
];

// The ground-truth value proposition the copy is judged *against* — the internal
// pitch docs that state what the product is actually for. Supplied separately so
// the model judges alignment (copy vs. value prop), not just internal polish.
const DEFAULT_VALUE_PROP_FILES = [
  "../docs/founder/christian-pitch.md",
  "../docs/founder/csm/README.md"
];

// A landing-copy judgment is a "big-picture-thinking" task; route by kind so the
// check tracks the model-routing table rather than pinning a model string.
const DEFAULT_TASK_KIND = "big-picture-thinking";

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(relativePaths, maxFileChars) {
  const files = [];
  for (const relativePath of relativePaths) {
    const absolutePath = workspacePath(relativePath);
    if (await exists(absolutePath)) {
      files.push({ relativePath, content: truncate(await readFile(absolutePath, "utf8"), maxFileChars) });
    } else {
      files.push({ relativePath, missing: true });
    }
  }
  return files;
}

function renderFiles(files) {
  return files.map((file) => {
    if (file.missing) return `## ${file.relativePath}\n\n<MISSING>`;
    return `## ${file.relativePath}\n\n${file.content}`;
  }).join("\n\n---\n\n");
}

function buildPrompt(valuePropFiles, copyFiles) {
  return `You are a skeptical product marketer reviewing Commonality's landing and pitch copy.

Your job is to judge whether the COPY UNDER REVIEW actually lands the product's real VALUE PROPOSITION: would a prospective user or backer come away convinced, and does the copy match what the product is genuinely for? Do not praise; find where the copy is unconvincing, vague, off-message, or misaligned with the value prop.

Voice guidance — Commonality's CSM-facing copy aims for a RECOGNITION register, not a PERSUASION one: it assumes the reader is already part of the sane majority and shares the worldview, and uses confident, knowing language that lets the reader recognize "they see it the way I do." It should state what was built, not over-explain why the reader should care, and should NOT lead with the emotional/frustration angle. Flag copy that lapses into preachy persuasion, explains the premise from scratch, or leads with frustration. Flag copy that over-relies on a single mechanism (e.g. "we removed the organizer") rather than the synthesis/flywheel.

Look for:
- value-prop misalignment (copy sells something different from, or narrower than, what the value-prop docs describe);
- unconvincing claims (assertions with no support, vague hand-waving, undefined benefit);
- weak or buried lede (the most compelling point is missing or hidden below filler);
- voice violations (persuasion-register preachiness, premise-explaining, frustration-leading, single-mechanism over-reliance);
- placeholder or unfinished copy shipped as if final (TODOs, duplicated text, lorem-style filler).

Return ONLY a single JSON object with this exact shape:
{
  "status": "pass" | "uncertain",
  "summary": "one-line summary",
  "findings": [
    {
      "title": "short title",
      "severity": "high" | "medium" | "low",
      "kind": "misalignment" | "unconvincing" | "weak-lede" | "voice" | "unfinished",
      "evidence": ["specific copy/quote and where it appears"],
      "recommendation": "concrete copy fix"
    }
  ],
  "reportMarkdown": "Markdown report with sections: Scope reviewed, Main findings, Suggested fixes, Skipped/uncertain scope"
}

Status policy:
- Use "uncertain" if you find any plausible problem worth human triage.
- Use "pass" only if the copy is compelling and aligned with the value prop and you have no material findings after actively reviewing it.
- Do not set "fail" yourself; the harness derives the gating status from finding severities.

Severity calibration (the harness turns any "high" finding into a deploy-blocking red, "medium"/"low" into advisory yellow):
- "high": the copy misrepresents the value prop, makes an unconvincing/unfinished claim, or violates voice in a way that would lose a target reader.
- "medium": a real weakness (soft lede, vague claim) that dampens but does not break the pitch.
- "low": polish or wording nitpicks.

The product's actual VALUE PROPOSITION (ground truth) follows.

${renderFiles(valuePropFiles)}

============================================================

The COPY UNDER REVIEW follows.

${renderFiles(copyFiles)}`;
}

emit(async () => {
  const params = mergedParams(readInputs());
  const maxFileChars = Number(params.maxFileChars ?? 60000);
  const valuePropFiles = await collectFiles(params.valuePropFiles ?? DEFAULT_VALUE_PROP_FILES, maxFileChars);
  const copyFiles = await collectFiles(params.copyFiles ?? DEFAULT_COPY_FILES, maxFileChars);
  const prompt = buildPrompt(valuePropFiles, copyFiles);
  const promptArtifact = await writeTextArtifact("prompt.md", prompt, "text/markdown", "Prompt, value-prop ground truth, and bounded copy surface supplied to the LLM marketer.");
  const model = resolveModel(params, {
    modelEnvVar: "COMMONALITY_VERIFIER_LANDING_COMPELLING_MODEL",
    defaultTaskKind: DEFAULT_TASK_KIND
  });

  let rawResponse;
  try {
    rawResponse = await getLlmResponse(prompt, params, promptArtifact.path, model, {
      fixtureEnvVar: "COMMONALITY_VERIFIER_LANDING_COMPELLING_FIXTURE_RESPONSE",
      commandEnvVar: "COMMONALITY_VERIFIER_LANDING_COMPELLING_COMMAND"
    });
  } catch (error) {
    return errorResult(`Could not run landing-compelling review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact] });
  }

  const rawArtifact = await writeTextArtifact("raw-response.txt", rawResponse, "text/plain", "Raw LLM response before JSON parsing.");

  let review;
  try {
    review = validateJudgmentResponse(parseJsonObject(rawResponse), { arrayFields: ["findings"] });
  } catch (error) {
    return errorResult(`Could not parse landing-compelling review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact, rawArtifact] });
  }

  const reportArtifact = await writeTextArtifact("report.md", review.reportMarkdown, "text/markdown", "LLM review of the landing/marketing copy against the product value proposition.");
  const findings = {
    valuePropFiles: valuePropFiles.map((file) => ({ path: file.relativePath, missing: Boolean(file.missing) })),
    copyFiles: copyFiles.map((file) => ({ path: file.relativePath, missing: Boolean(file.missing) })),
    findings: review.findings ?? [],
    model: model ?? "command-default"
  };
  const artifacts = [promptArtifact, rawArtifact, reportArtifact];

  const status = statusFromFindings(review.findings);
  if (status === "fail") return fail(review.summary, { findings, artifacts });
  if (status === "pass") return pass(review.summary, { findings, artifacts });
  return uncertain(review.summary, { findings, artifacts });
});
