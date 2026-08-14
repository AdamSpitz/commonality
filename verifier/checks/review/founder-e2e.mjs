import { readFile } from "node:fs/promises";
import { emit, errorResult, fail, pass, readInputs, uncertain, workspacePath, writeTextArtifact } from "../lib/result.mjs";
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

// Founder-authored E2E judgment: the human writes the expected product in their
// own words; the LLM is not allowed to rephrase that brief into a "better" spec.
// It looks at the built surface (UI source, and the live site if it can find
// how to reach it) and reports whether the product more-or-less matches, plus
// independent user-judgment notes. Status maps from finding severities.

const DEFAULT_TASK_KIND = "big-picture-thinking";

async function loadFounderBrief(params) {
  if (typeof params.founderBrief === "string" && params.founderBrief.trim()) {
    return params.founderBrief.trimEnd();
  }
  const relative = params.founderBriefFile;
  if (typeof relative !== "string" || !relative.trim()) {
    throw new Error("founder-e2e check needs params.founderBrief or params.founderBriefFile.");
  }
  return (await readFile(workspacePath(relative), "utf8")).trimEnd();
}

function toRepoRelative(p) {
  return p.replace(/^(\.\.\/)+/, "").replace(/^\.\//, "");
}

function buildPrompt({ surface, founderBrief, startingPoints }) {
  const hints = (startingPoints ?? []).map(toRepoRelative);
  return `${explorationBriefing({
    role: "first-time user of the site who also has to report honestly to the founder",
    purpose: `Look at the ${surface} product and judge whether what we built more-or-less matches the founder-authored description below. Then, separately, use your judgment as a user: does the site make sense, or does it need improvement?

The description is written by the founder in their own words. Do NOT reword, summarize, or "improve" it into a different spec. Treat the verbatim text as the checklist. Docs and code comments are evidence about the product, not a replacement for this brief.`
  })}
Where to look:
- CauseStarter lives in \`causestarter/\` (not the eight-domain \`ui/\` package). Start from \`causestarter/README.md\` and the pages under \`causestarter/src/pages/\`.
- Local CauseStarter is typically http://localhost:5174 (Vite) or http://localhost:8090 (Docker SPA). You do not have a browser tool in this run; judge from source and docs unless a later run gives you live access.
- Suggested starting points (open these first, then follow the product wherever it leads):
${hints.length > 0 ? hints.map((p) => `  - \`${p}\``).join("\n") : "  - (none specified — locate the surface yourself from the README)"}

FOUNDER-AUTHORED DESCRIPTION (verbatim — this is what you are checking against):
-----
${founderBrief}
-----

How to judge:
- "more-or-less fits" is the bar, not pixel-perfect completeness. Tentative wording ("maybe", "not sure what else", "I'll fill in more details later") is not a missing-feature fail.
- A clear founder claim that the product contradicts (for example: promoting a sitewide top-ten list of causes when the brief says you cannot browse) is a high-severity mismatch.
- A listed capability that is simply missing or hard to find is usually medium, unless the brief treats it as optional/tentative.
- Also report independent user-judgment notes (confusing copy, dead ends, things that work but feel wrong). Those can be findings even when they match the brief.

Return ONLY a single JSON object with this exact shape:
{
  "status": "pass" | "uncertain",
  "summary": "one-line summary",
${FILES_READ_FIELD_SPEC}
  "findings": [
    {
      "title": "short title",
      "severity": "high" | "medium" | "low",
      "kind": "mismatch" | "missing" | "user-judgment" | "docs-gap",
      "evidence": ["specific route/copy/file and how it compares to the founder text"],
      "recommendation": "concrete product or UX change"
    }
  ],
  "reportMarkdown": "Markdown report with sections: Surface reviewed, Founder brief (quoted, not rewritten), How I looked, Fit vs the brief, User-judgment notes, Suggested fixes, Skipped/uncertain scope"
}

Status policy:
- Use "uncertain" if anything is worth human triage.
- Use "pass" only if the product more-or-less matches the brief and you have no material user-judgment problems.
- Do not set "fail" yourself; the harness derives the gating status from finding severities.

Severity calibration (the harness turns any "high" finding into a deploy-blocking red, "medium"/"low" into advisory yellow):
- "high": a clear founder claim is contradicted, or a core listed path is absent in a way that would mislead a user about what this site is.
- "medium": a listed (non-tentative) capability is missing, hard to find, or confusing.
- "low": polish, tentative/maybe items, or minor wording.`;
}

emit(async () => {
  const params = mergedParams(readInputs());
  const surface = params.surface ?? "the product";
  let founderBrief;
  try {
    founderBrief = await loadFounderBrief(params);
  } catch (error) {
    return errorResult(`Could not load founder brief: ${error?.message ?? String(error)}`);
  }

  const prompt = buildPrompt({
    surface,
    founderBrief,
    startingPoints: params.startingPoints
  });
  const promptArtifact = await writeTextArtifact(
    "prompt.md",
    prompt,
    "text/markdown",
    "Role briefing plus the verbatim founder-authored description supplied to the E2E reviewer."
  );
  const briefArtifact = await writeTextArtifact(
    "founder-brief.md",
    founderBrief + "\n",
    "text/markdown",
    "Founder-authored description used as the spec (not rewritten by the check)."
  );
  const model = resolveModel(params, {
    modelEnvVar: "COMMONALITY_VERIFIER_FOUNDER_E2E_MODEL",
    defaultTaskKind: DEFAULT_TASK_KIND
  });

  let rawResponse;
  let usage = null;
  let llmResult;
  try {
    llmResult = await getLlmResponse(prompt, params, promptArtifact.path, model, {
      fixtureEnvVar: "COMMONALITY_VERIFIER_FOUNDER_E2E_FIXTURE_RESPONSE",
      commandEnvVar: "COMMONALITY_VERIFIER_FOUNDER_E2E_COMMAND",
      explore: true
    });
  } catch (error) {
    const artifacts = [promptArtifact, briefArtifact];
    if (error?.partialStdout) {
      artifacts.push(await writeTextArtifact("partial-stdout.txt", error.partialStdout, "text/plain", "Stdout the LLM subprocess had streamed back before it was killed for timing out."));
    }
    if (error?.partialStderr) {
      artifacts.push(await writeTextArtifact("partial-stderr.txt", error.partialStderr, "text/plain", "Stderr the LLM subprocess had streamed back before it was killed for timing out."));
    }
    return errorResult(`Could not run founder-authored E2E review: ${error?.message ?? String(error)}`, { artifacts });
  }

  rawResponse = llmResult.text;
  usage = llmResult.usage;
  const rawArtifact = await writeTextArtifact("raw-response.txt", rawResponse, "text/plain", "Raw LLM response before JSON parsing.");

  let review;
  try {
    review = validateJudgmentResponse(parseJsonObject(rawResponse), { arrayFields: ["findings", "filesRead"] });
  } catch (error) {
    return errorResult(`Could not parse founder-authored E2E review: ${error?.message ?? String(error)}`, {
      artifacts: [promptArtifact, briefArtifact, rawArtifact]
    });
  }

  const reportArtifact = await writeTextArtifact(
    "report.md",
    review.reportMarkdown,
    "text/markdown",
    `LLM review of whether ${surface} more-or-less matches the founder-authored description.`
  );
  const filesReadArtifact = await writeFilesReadArtifact(review.filesRead);
  const findings = {
    surface,
    founderBriefFile: params.founderBriefFile ?? null,
    filesRead: review.filesRead ?? [],
    findings: review.findings ?? [],
    model: model ?? "command-default",
    usage
  };
  const artifacts = [promptArtifact, briefArtifact, rawArtifact, reportArtifact, filesReadArtifact];

  const status = statusFromFindings(review.findings);
  if (status === "fail") return fail(review.summary, { findings, artifacts });
  if (status === "pass") return pass(review.summary, { findings, artifacts });
  return uncertain(review.summary, { findings, artifacts });
});
