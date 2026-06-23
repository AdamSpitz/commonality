import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { emit, errorResult, readInputs, truncate, uncertain, pass, workspacePath, writeTextArtifact } from "../lib/result.mjs";
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

const DEFAULT_INPUT_FILES = [
  "README.md",
  "PLAN.md",
  "coverage/testing-plan-items.json",
  "testing-plan.md",
  "manual-validation-plan.md"
];

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectDefFiles(dir) {
  const files = [];

  async function visit(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
      } else if (entry.name.endsWith(".def.json")) {
        files.push(entryPath);
      }
    }
  }

  await visit(dir);
  return files.sort();
}

async function latestResultFile(checkId) {
  const dir = workspacePath("results", checkId);
  if (!(await exists(dir))) return null;
  const entries = await readdir(dir, { withFileTypes: true });
  const jsonFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(dir, entry.name))
    .sort();
  return jsonFiles.at(-1) ?? null;
}

async function readBoundedFile(filePath, maxChars) {
  const content = await readFile(filePath, "utf8");
  return truncate(content, maxChars);
}

async function collectReviewInputs(params) {
  const maxFileChars = Number(params.maxFileChars ?? 60000);
  const files = [];

  for (const relativePath of params.inputFiles ?? DEFAULT_INPUT_FILES) {
    const absolutePath = workspacePath(relativePath);
    if (await exists(absolutePath)) {
      files.push({ relativePath, content: await readBoundedFile(absolutePath, maxFileChars) });
    } else {
      files.push({ relativePath, missing: true });
    }
  }

  const defFiles = await collectDefFiles(workspacePath("checks"));
  for (const defFile of defFiles) {
    files.push({
      relativePath: path.relative(process.env.VERIFIER_WORKSPACE ?? process.cwd(), defFile),
      content: await readBoundedFile(defFile, maxFileChars)
    });
  }

  const rootResult = await latestResultFile("root");
  if (rootResult) {
    files.push({
      relativePath: path.relative(process.env.VERIFIER_WORKSPACE ?? process.cwd(), rootResult),
      content: await readBoundedFile(rootResult, maxFileChars)
    });
  } else {
    files.push({ relativePath: "results/root/<latest>", missing: true });
  }

  return files;
}

function buildPrompt(files) {
  const renderedFiles = files.map((file) => {
    if (file.missing) return `## ${file.relativePath}\n\n<MISSING>`;
    return `## ${file.relativePath}\n\n${file.content}`;
  }).join("\n\n---\n\n");

  return `${explorationBriefing({
    role: "founder doing an adversarial review of your project's QA organization (the verifier check system)",
    purpose: `Find weaknesses in the *system of checks* — not to praise the project, but to find what it fails to assure. To judge whether the checks cover what matters, you must understand what the product is actually supposed to do and what would hurt most if it broke; read the product/founder docs the README points to, then weigh them against the verifier's own check inventory (supplied in full below).`
  })}
Look for:
- important product/system risks not represented by any verifier check (this is where reading the product docs pays off);
- checks that are stale, noisy, too broad, too expensive, or easy to falsely pass;
- supervisors that hide missing/stale coverage;
- objective checks that should replace or support manual/LLM judgment;
- verifier-of-verifier checks that would make this validation system more trustworthy.

Return ONLY a single JSON object with this exact shape:
{
  "status": "pass" | "uncertain",
  "summary": "one-line summary",
${FILES_READ_FIELD_SPEC}
  "materialRecommendations": [
    {
      "title": "short title",
      "severity": "high" | "medium" | "low",
      "evidence": ["specific file/check/result evidence"],
      "recommendation": "concrete verifier change"
    }
  ],
  "reportMarkdown": "Markdown report with sections: Scope reviewed, Main findings, Suggested next checks, Skipped/uncertain scope"
}

Status policy:
- Treat high/medium-severity recommendations as significant verifier improvements that should block an all-green dashboard until triaged.
- Use "uncertain" if you find any high- or medium-severity material coverage gap or verifier design weakness needing human triage.
- Use "pass" if you find only low-severity/nice-to-have ideas or no material new recommendations after actively reviewing the supplied scope.
- Do not use "fail"; speculative verifier-improvement ideas should not page directly.
- If a file is missing, mention whether that is itself important.

The verifier's own check inventory (every check definition plus the latest root result) follows. Read the PRODUCT docs yourself via the read/grep/find/ls tools to judge what these checks *should* be covering.

${renderedFiles}`;
}

// Default to a task-kind rather than a hardcoded model string: an adversarial
// review of the verifier is a "big-picture-thinking" task, and routing by kind
// keeps this check correct as the model-routing table evolves.
const DEFAULT_LLM_REVIEW_TASK_KIND = "big-picture-thinking";

emit(async () => {
  const params = mergedParams(readInputs());
  const files = await collectReviewInputs(params);
  const prompt = buildPrompt(files);
  const promptArtifact = await writeTextArtifact("prompt.md", prompt, "text/markdown", "Prompt and bounded context supplied to the LLM reviewer.");
  const model = resolveModel(params, {
    modelEnvVar: "COMMONALITY_VERIFIER_LLM_REVIEW_MODEL",
    defaultTaskKind: DEFAULT_LLM_REVIEW_TASK_KIND
  });

  let rawResponse;
  try {
    rawResponse = await getLlmResponse(prompt, params, promptArtifact.path, model, {
      fixtureEnvVar: "COMMONALITY_VERIFIER_LLM_REVIEW_FIXTURE_RESPONSE",
      commandEnvVar: "COMMONALITY_VERIFIER_LLM_REVIEW_COMMAND",
      explore: true
    });
  } catch (error) {
    return errorResult(`Could not run LLM verifier review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact] });
  }

  const rawArtifact = await writeTextArtifact("raw-response.txt", rawResponse, "text/plain", "Raw LLM response before JSON parsing.");

  let review;
  try {
    review = validateJudgmentResponse(parseJsonObject(rawResponse), { arrayFields: ["materialRecommendations", "filesRead"] });
  } catch (error) {
    return errorResult(`Could not parse LLM verifier review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact, rawArtifact] });
  }

  const reportArtifact = await writeTextArtifact("report.md", review.reportMarkdown, "text/markdown", "Adversarial LLM review of the verifier check system.");
  const filesReadArtifact = await writeFilesReadArtifact(review.filesRead);
  const materialRecommendations = review.materialRecommendations ?? [];
  const significantRecommendations = materialRecommendations.filter((recommendation) => recommendation?.severity !== "low");
  const derivedStatus = significantRecommendations.length > 0 ? "uncertain" : "pass";
  const findings = {
    reviewedFiles: files.map((file) => ({ path: file.relativePath, missing: Boolean(file.missing) })),
    filesRead: review.filesRead ?? [],
    materialRecommendations,
    significantRecommendationCount: significantRecommendations.length,
    statusPolicy: "High/medium verifier-improvement recommendations are gating; low-severity ideas are recorded but do not block green. Recommendations without an explicit low severity are treated as significant.",
    model: model ?? "command-default"
  };
  const artifacts = [promptArtifact, rawArtifact, reportArtifact, filesReadArtifact];

  if (derivedStatus === "pass") return pass(review.summary, { findings, artifacts });
  return uncertain(review.summary, { findings, artifacts });
});
