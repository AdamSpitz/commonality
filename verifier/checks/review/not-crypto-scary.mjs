import { readFile, stat } from "node:fs/promises";
import { emit, errorResult, fail, pass, readInputs, truncate, uncertain, workspacePath, writeTextArtifact } from "../lib/result.mjs";
import { getLlmResponse, mergedParams, parseJsonObject, resolveModel, statusFromFindings, validateJudgmentResponse } from "../lib/llm-judgment.mjs";

// Standing advisory LLM-judgment leaf: reads landing pages and key copy against
// the explicit target audience described in christian-pitch.md — skeptical,
// non-crypto-native normal people — and flags anything that would make them bounce:
// wallet/chain/token jargon, UI patterns that look like a trading terminal, or
// copy that signals "this is the crypto stuff I'm skeptical of." The model's
// declared status may be fail/uncertain/pass, but the emitted status is derived
// deterministically from structured finding severities so the model cannot talk
// a jargon-filled surface into a pass.

const DEFAULT_CONTEXT_FILES = [
  "../docs/founder/christian-pitch.md"
];

const DEFAULT_SURFACE_FILES = [
  "../ui/src/domains/commonality/LandingPage.tsx",
  "../ui/src/domains/common-sense-majority/LandingPage.tsx",
  "../ui/src/domains/alignment/LandingPage.tsx",
  "../ui/src/domains/lazy-giving/LandingPage.tsx",
  "../ui/src/domains/content-funding/LandingPage.tsx",
  "../ui/src/domains/tally/LandingPage.tsx",
  "../ui/src/domains/civility/LandingPage.tsx",
  "../ui/src/domains/conceptspace/LandingPage.tsx",
  "../ui/src/domains/delegation/LandingPage.tsx",
  "../docs/end-user/tldr-for-llms.md"
];

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

function buildPrompt(contextFiles, surfaceFiles) {
  return `You are a skeptical reviewer representing the target audience described in the CONTEXT below: a non-crypto-native normal person (think: churchgoing adult, comfortable with banking apps and donation sites, but instinctively wary of anything that sounds like "the crypto stuff"). Your job is to read the UI SURFACE and flag anything that would make this person uncomfortable, confused, or likely to leave.

The product's explicit goal is that the screens look and feel like the giving apps and banking apps the user already trusts — NOT like a crypto trading terminal. If it's scary, it's not done. The product also explicitly targets people who should never need to understand the blockchain machinery underneath.

Look specifically for:
- crypto/web3 jargon visible to end users: "wallet," "gas," "token," "chain," "on-chain," "smart contract," "protocol," "mint," "NFT," "DAO," "IPFS," "hash," "transaction hash," or similar terms used in user-facing copy without plain-English translation;
- trading-terminal patterns: price tickers, token balances, speculative framing ("value goes up"), exchange-style language, anything that suggests this is an investment or financial instrument;
- tech-trust signals that imply complexity: showing blockchain addresses, transaction hashes, or other raw protocol data directly to users without abstraction;
- copy that admits the UX is hard or unfinished in a way that would scare off non-technical users (e.g. "still a work in progress" near a call-to-action);
- anything else a skeptical normal person would read as "this is the weird computerized protocol I was warned about."

You are NOT judging overall UX quality or copy strength here — only whether a crypto-skeptical normal person would bounce based on jargon, trading-terminal vibes, or scary tech exposure.

Return ONLY a single JSON object with this exact shape:
{
  "status": "pass" | "uncertain" | "fail",
  "summary": "one-line summary",
  "findings": [
    {
      "title": "short title",
      "severity": "high" | "medium" | "low",
      "kind": "jargon" | "trading-vibes" | "raw-protocol-data" | "admitted-roughness" | "other",
      "evidence": ["specific copy/UI element and where it appears"],
      "recommendation": "concrete fix"
    }
  ],
  "reportMarkdown": "Markdown report with sections: Scope reviewed, Main findings, Suggested fixes, Skipped/uncertain scope"
}

Status policy:
- Use "fail" if you find a concrete high-severity problem: a jargon term, trading-terminal pattern, or raw protocol exposure that would directly alarm a skeptical normal person with no escape hatch.
- Use "uncertain" if you find plausible problems that need human judgment before calling it a blocker.
- Use "pass" only if a crypto-skeptical normal person could read the entire surface and encounter nothing that signals "crypto/tech weirdness."

Severity calibration:
- "high": a term or pattern that directly signals crypto (wallet, gas, token, on-chain, etc.) or a trading-terminal UI pattern in user-facing copy, with no plain-English abstraction.
- "medium": borderline technical language or vibes that might cause a skeptical reader to hesitate but not necessarily bounce.
- "low": minor roughness or phrasing that could be softened.

The TARGET AUDIENCE CONTEXT (who this product is explicitly trying to reassure) follows.

${renderFiles(contextFiles)}

============================================================

The UI SURFACE under review follows.

${renderFiles(surfaceFiles)}`;
}

emit(async () => {
  const params = mergedParams(readInputs());
  const maxFileChars = Number(params.maxFileChars ?? 60000);
  const contextFiles = await collectFiles(params.contextFiles ?? DEFAULT_CONTEXT_FILES, maxFileChars);
  const surfaceFiles = await collectFiles(params.surfaceFiles ?? DEFAULT_SURFACE_FILES, maxFileChars);

  const prompt = buildPrompt(contextFiles, surfaceFiles);
  const promptArtifact = await writeTextArtifact("prompt.md", prompt, "text/markdown", "Prompt, target-audience context, and UI surface supplied to the LLM crypto-scariness reviewer.");
  const model = resolveModel(params, {
    modelEnvVar: "COMMONALITY_VERIFIER_NOT_CRYPTO_SCARY_MODEL",
    defaultTaskKind: DEFAULT_TASK_KIND
  });

  let rawResponse;
  try {
    rawResponse = await getLlmResponse(prompt, params, promptArtifact.path, model, {
      fixtureEnvVar: "COMMONALITY_VERIFIER_NOT_CRYPTO_SCARY_FIXTURE_RESPONSE",
      commandEnvVar: "COMMONALITY_VERIFIER_NOT_CRYPTO_SCARY_COMMAND"
    });
  } catch (error) {
    return errorResult(`Could not run not-crypto-scary review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact] });
  }

  const rawArtifact = await writeTextArtifact("raw-response.txt", rawResponse, "text/plain", "Raw LLM response before JSON parsing.");

  let review;
  try {
    review = validateJudgmentResponse(parseJsonObject(rawResponse), { validStatuses: ["pass", "uncertain", "fail"], arrayFields: ["findings"] });
  } catch (error) {
    return errorResult(`Could not parse not-crypto-scary review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact, rawArtifact] });
  }

  const reportArtifact = await writeTextArtifact("report.md", review.reportMarkdown, "text/markdown", "LLM review of whether the UI/copy would alarm a crypto-skeptical normal person.");
  const findings = {
    contextFiles: contextFiles.map((file) => ({ path: file.relativePath, missing: Boolean(file.missing) })),
    surfaceFiles: surfaceFiles.map((file) => ({ path: file.relativePath, missing: Boolean(file.missing) })),
    findings: review.findings ?? [],
    model: model ?? "command-default"
  };
  const artifacts = [promptArtifact, rawArtifact, reportArtifact];

  const status = statusFromFindings(review.findings);
  if (status === "fail") return fail(review.summary, { findings, artifacts });
  if (status === "pass") return pass(review.summary, { findings, artifacts });
  return uncertain(review.summary, { findings, artifacts });
});
