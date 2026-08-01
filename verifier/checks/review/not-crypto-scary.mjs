import { emit, errorResult, fail, pass, readInputs, uncertain, writeTextArtifact } from "../lib/result.mjs";
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

// Standing gating LLM-judgment leaf: read the user-facing landing pages and key
// copy and flag anything a crypto-skeptical normal person would find alarming.
// EXPLORATION leaf: the model is briefed on its purpose, pointed at the README,
// and given read-only repo access so it reads the target-audience docs and the
// per-domain landing-page source itself. The emitted status is derived
// deterministically from structured finding severities (statusFromFindings) so
// the model cannot talk a jargon-filled surface into a pass.

const DEFAULT_TASK_KIND = "big-picture-thinking";

function buildPrompt() {
  return `${explorationBriefing({
    role: "crypto-skeptical normal person (think: churchgoing adult, comfortable with banking and donation apps, but instinctively wary of anything that sounds like 'the crypto stuff')",
    purpose: `Read Commonality's user-facing UI copy and flag anything that would make this person uncomfortable, confused, or likely to leave.

First understand who the product is explicitly trying to reassure and what 'not scary' means for it (the founder/target-audience docs the README points to make this explicit). Then read the actual user-facing surface: the per-domain LandingPage source under ui/src/domains/ and any other prominent end-user copy. The product's explicit goal is that the screens look and feel like the giving/banking apps the user already trusts — NOT like a crypto trading terminal. If it's scary, it's not done.`
  })}
Judge the context and user task, not a blacklist of words. Crypto terminology is acceptable when the user deliberately opens technical details, is performing an inherently crypto-specific operation, or needs an accurate term to understand custody, settlement, cost, or risk. A plain-English label may be followed by the precise term. Do not flag a word merely because it appears somewhere in the repository or UI.

Look specifically for:
- crypto/web3 jargon that is prominent, unexplained, or unnecessary in a mainstream user's primary path: terms such as "wallet," "gas," "token," "chain," "on-chain," "smart contract," "protocol," "mint," "NFT," "DAO," "IPFS," "hash," or "transaction hash" when they displace the user's actual goal or appear without useful plain-English context;
- trading-terminal patterns: price tickers, token balances, speculative framing ("value goes up"), exchange-style language, anything that suggests this is an investment or financial instrument;
- raw protocol exposure: blockchain addresses, transaction hashes, or other protocol data shown directly to users without abstraction;
- copy that admits the UX is hard or unfinished in a way that would scare off non-technical users (e.g. "still a work in progress" near a call-to-action);
- anything else a skeptical normal person would read as "this is the weird computerized protocol I was warned about."

You are NOT judging overall UX quality or copy strength here — only whether a crypto-skeptical normal person would bounce based on jargon, trading-terminal vibes, or scary tech exposure.

Return ONLY a single JSON object with this exact shape:
{
  "status": "pass" | "uncertain" | "fail",
  "summary": "one-line summary",
${FILES_READ_FIELD_SPEC}
  "findings": [
    {
      "title": "short title",
      "severity": "high" | "medium" | "low",
      "kind": "jargon" | "trading-vibes" | "raw-protocol-data" | "admitted-roughness" | "docs-gap" | "other",
      "evidence": ["specific copy/UI element and where it appears"],
      "recommendation": "concrete fix"
    }
  ],
  "reportMarkdown": "Markdown report with sections: Scope reviewed, How I briefed myself, Main findings, Suggested fixes, Skipped/uncertain scope"
}

Status policy:
- Use "fail" only for a concrete high-severity problem in a primary mainstream path: avoidable crypto framing dominates the task, raw protocol data is presented as the normal UX, or trading/investment framing could materially mislead or repel the target user.
- Use "uncertain" for repeated unnecessary jargon, a technical term whose context or disclosure level needs human judgment, or a problem confined to secondary/advanced surfaces.
- Use "pass" when primary mainstream paths are calm and goal-oriented, even if accurate crypto terms appear in optional technical details or inherently crypto-specific operations.

Severity calibration:
- "high": prominent avoidable crypto/trading/protocol exposure in a primary CTA, hero, ordinary giving/refund path, or other mainstream task, likely to make the target user abandon or misunderstand the task.
- "medium": unnecessary or weakly explained terminology in a secondary surface, or repeated jargon that adds friction but does not dominate the primary task.
- "low": accurate terminology in optional details that could be translated better; do not report isolated harmless uses.

For every finding, explain why its specific placement and context cause harm. A bare list of matched words is not a valid finding.`;
}

emit(async () => {
  const params = mergedParams(readInputs());
  const prompt = buildPrompt();
  const promptArtifact = await writeTextArtifact("prompt.md", prompt, "text/markdown", "Role/purpose briefing supplied to the exploration-mode crypto-scariness reviewer (the model reads the audience docs and UI copy itself).");
  const model = resolveModel(params, {
    modelEnvVar: "COMMONALITY_VERIFIER_NOT_CRYPTO_SCARY_MODEL",
    defaultTaskKind: DEFAULT_TASK_KIND
  });

  let rawResponse;
  let usage = null;
  let llmResult;
  try {
    llmResult = await getLlmResponse(prompt, params, promptArtifact.path, model, {
      fixtureEnvVar: "COMMONALITY_VERIFIER_NOT_CRYPTO_SCARY_FIXTURE_RESPONSE",
      commandEnvVar: "COMMONALITY_VERIFIER_NOT_CRYPTO_SCARY_COMMAND",
      explore: true
    });
  } catch (error) {
    return errorResult(`Could not run not-crypto-scary review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact] });
  }

  rawResponse = llmResult.text;
  usage = llmResult.usage;
  const rawArtifact = await writeTextArtifact("raw-response.txt", rawResponse, "text/plain", "Raw LLM response before JSON parsing.");

  let review;
  try {
    review = validateJudgmentResponse(parseJsonObject(rawResponse), { validStatuses: ["pass", "uncertain", "fail"], arrayFields: ["findings", "filesRead"] });
  } catch (error) {
    return errorResult(`Could not parse not-crypto-scary review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact, rawArtifact] });
  }

  const reportArtifact = await writeTextArtifact("report.md", review.reportMarkdown, "text/markdown", "LLM review of whether the UI/copy would alarm a crypto-skeptical normal person.");
  const filesReadArtifact = await writeFilesReadArtifact(review.filesRead);
  const findings = {
    filesRead: review.filesRead ?? [],
    findings: review.findings ?? [],
    model: model ?? "command-default",
    usage
  };
  const artifacts = [promptArtifact, rawArtifact, reportArtifact, filesReadArtifact];

  const status = statusFromFindings(review.findings);
  if (status === "fail") return fail(review.summary, { findings, artifacts });
  if (status === "pass") return pass(review.summary, { findings, artifacts });
  return uncertain(review.summary, { findings, artifacts });
});
