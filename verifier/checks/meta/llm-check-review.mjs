import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { emit, errorResult, readInputs, truncate, uncertain, pass, workspacePath, writeTextArtifact } from "../lib/result.mjs";

const DEFAULT_INPUT_FILES = [
  "README.md",
  "PLAN.md",
  "coverage/testing-plan-items.json",
  "../workflow/testing/README.md",
  "../workflow/testing/manual-tests/README.md"
];

const REQUIRED_RESPONSE_FIELDS = ["status", "summary", "reportMarkdown"];
const VALID_REVIEW_STATUSES = new Set(["pass", "uncertain"]);

function paramsInputs(inputs) {
  return inputs.filter((input) => input.kind === "params").map((input) => input.data ?? {});
}

function mergedParams(inputs) {
  return Object.assign({}, ...paramsInputs(inputs));
}

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

function parseJsonObject(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) throw new Error("LLM response did not contain a JSON object.");
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

function validateReviewResponse(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("LLM response JSON must be an object.");
  for (const field of REQUIRED_RESPONSE_FIELDS) {
    if (!(field in value)) throw new Error(`LLM response missing required field '${field}'.`);
  }
  if (!VALID_REVIEW_STATUSES.has(value.status)) throw new Error("LLM response status must be 'pass' or 'uncertain'.");
  if (typeof value.summary !== "string" || value.summary.length === 0) throw new Error("LLM response summary must be a non-empty string.");
  if (typeof value.reportMarkdown !== "string" || value.reportMarkdown.length === 0) throw new Error("LLM response reportMarkdown must be a non-empty string.");
  if (value.materialRecommendations !== undefined && !Array.isArray(value.materialRecommendations)) {
    throw new Error("LLM response materialRecommendations must be an array when present.");
  }
  return value;
}

async function runCommand(command, args, input, timeoutMs) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: workspacePath(), stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`LLM command timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`LLM command exited ${code}. stderr: ${truncate(stderr, 2000)}`));
        return;
      }
      resolve({ stdout, stderr });
    });

    child.stdin.end(input);
  });
}

function defaultPiArgs(params, promptArtifactPath) {
  const args = ["--print", "--no-session", "--no-tools", "--no-context-files", "--mode", "text"];
  const model = process.env.COMMONALITY_VERIFIER_LLM_REVIEW_MODEL ?? params.model;
  if (model) args.push("--model", model);
  args.push(`@${promptArtifactPath}`);
  return args;
}

async function getLlmResponse(prompt, params, promptArtifactPath) {
  if (process.env.COMMONALITY_VERIFIER_LLM_REVIEW_FIXTURE_RESPONSE) {
    return process.env.COMMONALITY_VERIFIER_LLM_REVIEW_FIXTURE_RESPONSE;
  }

  const command = params.command ?? process.env.COMMONALITY_VERIFIER_LLM_REVIEW_COMMAND ?? "pi";
  const usesCustomArgs = Array.isArray(params.args);
  const args = usesCustomArgs ? params.args : defaultPiArgs(params, promptArtifactPath);
  const timeoutMs = Number(params.commandTimeoutMs ?? 600000);
  const { stdout } = await runCommand(command, args, usesCustomArgs ? prompt : "", timeoutMs);
  return stdout;
}

emit(async () => {
  const params = mergedParams(readInputs());
  const files = await collectReviewInputs(params);
  const prompt = buildPrompt(files);
  const promptArtifact = await writeTextArtifact("prompt.md", prompt, "text/markdown", "Prompt and bounded context supplied to the LLM reviewer.");

  let rawResponse;
  try {
    rawResponse = await getLlmResponse(prompt, params, promptArtifact.path);
  } catch (error) {
    return errorResult(`Could not run LLM verifier review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact] });
  }

  const rawArtifact = await writeTextArtifact("raw-response.txt", rawResponse, "text/plain", "Raw LLM response before JSON parsing.");

  let review;
  try {
    review = validateReviewResponse(parseJsonObject(rawResponse));
  } catch (error) {
    return errorResult(`Could not parse LLM verifier review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact, rawArtifact] });
  }

  const reportArtifact = await writeTextArtifact("report.md", review.reportMarkdown, "text/markdown", "Adversarial LLM review of the verifier check system.");
  const findings = {
    reviewedFiles: files.map((file) => ({ path: file.relativePath, missing: Boolean(file.missing) })),
    materialRecommendations: review.materialRecommendations ?? [],
    model: process.env.COMMONALITY_VERIFIER_LLM_REVIEW_MODEL ?? params.model ?? "pi-default"
  };
  const artifacts = [promptArtifact, rawArtifact, reportArtifact];

  if (review.status === "pass") return pass(review.summary, { findings, artifacts });
  return uncertain(review.summary, { findings, artifacts });
});
