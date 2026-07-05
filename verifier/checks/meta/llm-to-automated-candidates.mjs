import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { emit, errorResult, pass, readInputs, truncate, uncertain, workspacePath, writeTextArtifact } from "../lib/result.mjs";
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

// Standing advisory leaf: scans the checks that currently rely on LLM judgment or
// human/manual attestation and asks a model which of them have stable enough,
// objective enough success criteria to be (wholly or partly) replaced or backed
// by deterministic automated tests. This makes "graduate subjective checks into
// conventional tests" a first-class recurring discipline rather than one buried
// bullet inside meta.llm-check-review. Advisory like its siblings: status is
// mapped deterministically (pass | uncertain, never fail) so a promotion idea
// surfaces for human triage without paging root.

// Checks whose source we feed in full because they ARE the subjective/manual
// surface under review. Detected structurally below; this list is a fallback for
// naming so the prompt stays readable.
const SUBJECTIVE_HINTS = ["meta.llm-check-review", "meta.llm-to-automated-candidates"];

const DEFAULT_TASK_KIND = "big-picture-thinking";

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectDefs(dir) {
  const defs = [];
  async function visit(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
      } else if (entry.name.endsWith(".def.json")) {
        const raw = await readFile(entryPath, "utf8");
        defs.push({ path: path.relative(workspacePath(), entryPath), def: JSON.parse(raw), raw });
      }
    }
  }
  await visit(dir);
  return defs.sort((a, b) => a.path.localeCompare(b.path));
}

// A check is "subjective" if it runs an LLM judgment (its script imports
// llm-judgment.mjs). Checks that run report-attestation.mjs are deterministic
// structural/freshness validators — not candidates for automation promotion.
async function isSubjective(entry) {
  const command = Array.isArray(entry.def.command) ? entry.def.command.join(" ") : "";
  const scriptMatch = command.match(/checks\/\S+\.mjs/);
  if (scriptMatch) {
    const scriptPath = workspacePath(scriptMatch[0]);
    if (await exists(scriptPath)) {
      const source = await readFile(scriptPath, "utf8");
      if (source.includes("llm-judgment.mjs")) return true;
    }
  }
  return SUBJECTIVE_HINTS.some((hint) => (entry.def.id ?? "").includes(hint));
}

async function collectSubjectiveSources(entries, maxFileChars) {
  const sources = [];
  for (const entry of entries) {
    if (!(await isSubjective(entry))) continue;
    const command = Array.isArray(entry.def.command) ? entry.def.command.join(" ") : "";
    const scriptMatch = command.match(/checks\/\S+\.mjs/);
    let scriptBody = null;
    if (scriptMatch && (await exists(workspacePath(scriptMatch[0])))) {
      scriptBody = truncate(await readFile(workspacePath(scriptMatch[0]), "utf8"), maxFileChars);
    }
    sources.push({ id: entry.def.id, defPath: entry.path, description: entry.def.description, scriptPath: scriptMatch?.[0] ?? null, scriptBody });
  }
  return sources;
}

const CANDIDATE_ENUMS = {
  promotability: new Set(["full", "partial", "support-only"]),
  priority: new Set(["significant", "nice-to-have"]),
  effort: new Set(["low", "medium", "high"])
};

function requireNonEmptyString(value, fieldPath) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`LLM response ${fieldPath} must be a non-empty string.`);
  }
}

function requireEnum(value, fieldPath, allowed) {
  requireNonEmptyString(value, fieldPath);
  if (!allowed.has(value)) {
    throw new Error(`LLM response ${fieldPath} must be one of: ${Array.from(allowed).join(", ")}.`);
  }
}

function validateAutomationReview(value) {
  const review = validateJudgmentResponse(value, { arrayFields: ["candidates", "keepSubjective", "filesRead"] });
  for (const [index, candidate] of (review.candidates ?? []).entries()) {
    const fieldPath = `candidates[${index}]`;
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      throw new Error(`LLM response ${fieldPath} must be an object.`);
    }
    requireNonEmptyString(candidate.checkId, `${fieldPath}.checkId`);
    requireEnum(candidate.promotability, `${fieldPath}.promotability`, CANDIDATE_ENUMS.promotability);
    requireEnum(candidate.priority, `${fieldPath}.priority`, CANDIDATE_ENUMS.priority);
    requireNonEmptyString(candidate.mechanizableCriterion, `${fieldPath}.mechanizableCriterion`);
    requireNonEmptyString(candidate.proposedTest, `${fieldPath}.proposedTest`);
    requireEnum(candidate.effort, `${fieldPath}.effort`, CANDIDATE_ENUMS.effort);
    if (!Array.isArray(candidate.evidence) || candidate.evidence.length === 0) {
      throw new Error(`LLM response ${fieldPath}.evidence must be a non-empty array.`);
    }
    candidate.evidence.forEach((evidence, evidenceIndex) => requireNonEmptyString(evidence, `${fieldPath}.evidence[${evidenceIndex}]`));
  }
  for (const [index, entry] of (review.keepSubjective ?? []).entries()) {
    requireNonEmptyString(entry, `keepSubjective[${index}]`);
  }
  return review;
}

function buildPrompt(sources, inventoryFile) {
  const renderedSources = sources.map((source) => {
    const header = `## ${source.id}\n\n- def: \`${source.defPath}\`\n- script: \`${source.scriptPath ?? "(none)"}\`\n- description: ${source.description ?? "(none)"}`;
    const body = source.scriptBody ? `\n\n\`\`\`js\n${source.scriptBody}\n\`\`\`` : "\n\n_(no inline script — likely a pure attestation/config check)_";
    return `${header}${body}`;
  }).join("\n\n---\n\n");

  const inventorySection = inventoryFile?.content
    ? `## Testing-plan inventory (for context on what each check is meant to cover)\n\n${inventoryFile.content}`
    : "## Testing-plan inventory\n\n<MISSING>";

  return `${explorationBriefing({
    role: "pragmatic test-automation architect reviewing your project's verifier",
    purpose: `Identify which of the verifier's subjective/manual checks (LLM-judgment leaves and human attestations) have success criteria stable and objective enough that a *conventional automated test* (a deterministic script, schema/lint rule, snapshot, fixture/golden comparison, or assertion) could replace them or back them up — reducing reliance on the model or human while preserving the signal. The subjective checks' own source is supplied below; read the product/tech docs or repo where it helps you judge whether a criterion is genuinely mechanizable.`
  })}
Those subjective checks are expensive, slow, or non-deterministic. Promote them where you safely can.

Be concrete and conservative:
- Only propose promotion where the criterion is genuinely objective and stable. Do NOT propose automating away genuine qualitative judgment (e.g. "is this copy compelling", "do the docs cohere") — for those, say so explicitly under keepSubjective.
- A check can be *partially* promoted: name the specific sub-criterion that is mechanizable (e.g. "broken-reference detection in docs-coherence could be a deterministic link/anchor checker") even if the rest stays subjective.
- Prefer cheap deterministic guards that catch the easy cases, leaving the model/human for the hard residue.

Return ONLY a single JSON object with this exact shape:
{
  "status": "pass" | "uncertain",
  "summary": "one-line summary",
${FILES_READ_FIELD_SPEC}
  "candidates": [
    {
      "checkId": "the subjective check id",
      "promotability": "full" | "partial" | "support-only",
      "priority": "significant" | "nice-to-have",
      "mechanizableCriterion": "the specific objective sub-criterion that could become a deterministic test",
      "proposedTest": "concrete description of the conventional test to write",
      "effort": "low" | "medium" | "high",
      "evidence": ["specific file/line/criterion evidence"]
    }
  ],
  "keepSubjective": ["checkIds (with one-line reason) that should stay LLM/manual"],
  "reportMarkdown": "Markdown report with sections: Scope reviewed, Promotion candidates, Keep subjective, Skipped/uncertain scope"
}

Status policy:
- Mark a candidate "significant" only when it is an objective automation opportunity that should block an all-green verifier dashboard until triaged.
- Mark minor polish or speculative automation as "nice-to-have".
- Use "uncertain" if you find any significant promotion candidate worth human triage.
- Use "pass" if you find only nice-to-have candidates or, after actively reviewing the supplied checks, none should be promoted right now.
- Do not use "fail"; these improvement ideas should not page directly.

Subjective/manual checks under review follow, then the inventory for context.

${renderedSources}

---

${inventorySection}`;
}

emit(async () => {
  const params = mergedParams(readInputs());
  const maxFileChars = Number(params.maxFileChars ?? 60000);

  const entries = await collectDefs(workspacePath("checks"));
  const sources = await collectSubjectiveSources(entries, maxFileChars);

  const inventoryPath = workspacePath("coverage/testing-plan-items.json");
  const inventoryFile = (await exists(inventoryPath))
    ? { content: truncate(await readFile(inventoryPath, "utf8"), maxFileChars) }
    : null;

  const prompt = buildPrompt(sources, inventoryFile);
  const promptArtifact = await writeTextArtifact("prompt.md", prompt, "text/markdown", "Prompt and bounded subjective-check surface supplied to the LLM reviewer.");

  if (sources.length === 0) {
    return pass("No LLM-judgment or attestation checks found to consider for promotion.", {
      findings: { subjectiveCheckCount: 0 },
      artifacts: [promptArtifact]
    });
  }

  const model = resolveModel(params, {
    modelEnvVar: "COMMONALITY_VERIFIER_LLM_TO_AUTOMATED_MODEL",
    defaultTaskKind: DEFAULT_TASK_KIND
  });

  let rawResponse;
  let usage = null;
  let llmResult;
  try {
    llmResult = await getLlmResponse(prompt, params, promptArtifact.path, model, {
      fixtureEnvVar: "COMMONALITY_VERIFIER_LLM_TO_AUTOMATED_FIXTURE_RESPONSE",
      commandEnvVar: "COMMONALITY_VERIFIER_LLM_TO_AUTOMATED_COMMAND",
      explore: true
    });
  } catch (error) {
    return errorResult(`Could not run llm-to-automated-candidates review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact] });
  }

  rawResponse = llmResult.text;
  usage = llmResult.usage;
  const rawArtifact = await writeTextArtifact("raw-response.txt", rawResponse, "text/plain", "Raw LLM response before JSON parsing.");

  let review;
  try {
    review = validateAutomationReview(parseJsonObject(rawResponse));
  } catch (error) {
    return errorResult(`Could not parse llm-to-automated-candidates review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact, rawArtifact] });
  }

  const reportArtifact = await writeTextArtifact("report.md", review.reportMarkdown, "text/markdown", "LLM review of which subjective checks could become conventional tests.");
  const filesReadArtifact = await writeFilesReadArtifact(review.filesRead);
  const candidates = review.candidates ?? [];
  const significantCandidates = candidates.filter((candidate) => candidate?.priority !== "nice-to-have");
  const derivedStatus = significantCandidates.length > 0 ? "uncertain" : "pass";
  const findings = {
    subjectiveCheckCount: sources.length,
    subjectiveCheckIds: sources.map((source) => source.id),
    filesRead: review.filesRead ?? [],
    candidates,
    significantCandidateCount: significantCandidates.length,
    statusPolicy: "Significant deterministic-automation promotion candidates are gating; nice-to-have candidates are recorded but do not block green. Candidate priority is required and validated before status derivation.",
    keepSubjective: review.keepSubjective ?? [],
    model: model ?? "command-default",
    usage
  };
  const artifacts = [promptArtifact, rawArtifact, reportArtifact, filesReadArtifact];

  if (derivedStatus === "pass") return pass(review.summary, { findings, artifacts });
  return uncertain(review.summary, { findings, artifacts });
});
