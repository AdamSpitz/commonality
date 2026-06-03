import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { emit, errorResult, readInputs, truncate, uncertain, pass, workspacePath, writeTextArtifact } from "../lib/result.mjs";
import { getLlmResponse, mergedParams, parseJsonObject, resolveModel, validateJudgmentResponse } from "../lib/llm-judgment.mjs";

const DEFAULT_INPUT_FILES = [
  "README.md",
  "PLAN.md",
  "coverage/testing-plan-items.json",
  "../workflow/testing/README.md",
  "../workflow/testing/manual-tests/README.md"
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

  return `You are an adversarial verifier architect reviewing Commonality's verifier workspace.

Your job is to find weaknesses in the *system of checks*, not to praise the project. Be concrete and skeptical.

Look for:
- important product/system risks not represented by any verifier check;
- checks that are stale, noisy, too broad, too expensive, or easy to falsely pass;
- supervisors that hide missing/stale coverage;
- objective checks that should replace or support manual/LLM judgment;
- verifier-of-verifier checks that would make this validation system more trustworthy.

Return ONLY a single JSON object with this exact shape:
{
  "status": "pass" | "uncertain",
  "summary": "one-line summary",
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
- Use "uncertain" if you find any plausible material coverage gap or verifier design weakness needing human triage.
- Use "pass" only if you find no material new recommendations after actively reviewing the supplied scope.
- Do not use "fail"; speculative verifier-improvement ideas should not page directly.
- If a file is missing, mention whether that is itself important.

Supplied scope follows.

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
      commandEnvVar: "COMMONALITY_VERIFIER_LLM_REVIEW_COMMAND"
    });
  } catch (error) {
    return errorResult(`Could not run LLM verifier review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact] });
  }

  const rawArtifact = await writeTextArtifact("raw-response.txt", rawResponse, "text/plain", "Raw LLM response before JSON parsing.");

  let review;
  try {
    review = validateJudgmentResponse(parseJsonObject(rawResponse), { arrayFields: ["materialRecommendations"] });
  } catch (error) {
    return errorResult(`Could not parse LLM verifier review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact, rawArtifact] });
  }

  const reportArtifact = await writeTextArtifact("report.md", review.reportMarkdown, "text/markdown", "Adversarial LLM review of the verifier check system.");
  const findings = {
    reviewedFiles: files.map((file) => ({ path: file.relativePath, missing: Boolean(file.missing) })),
    materialRecommendations: review.materialRecommendations ?? [],
    model: model ?? "command-default"
  };
  const artifacts = [promptArtifact, rawArtifact, reportArtifact];

  if (review.status === "pass") return pass(review.summary, { findings, artifacts });
  return uncertain(review.summary, { findings, artifacts });
});
