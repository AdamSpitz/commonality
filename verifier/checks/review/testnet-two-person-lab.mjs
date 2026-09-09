import { readFile } from "node:fs/promises";
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

const DEFAULT_TASK_KIND = "big-picture-thinking";

async function loadBrief(relative) {
  return (await readFile(new URL(relative, import.meta.url), "utf8")).trimEnd();
}

function buildPrompt({ brief }) {
  return `${explorationBriefing({
    role: "second operator of the live Base Sepolia lab (the Adam/Sam shared-lab job)",
    purpose: `Judge whether the deployed testnet is actually usable as a two-person lab. Prefer driving the live CauseStarter site. If you have a browser, use two independent sessions (two profiles, two origins, or two HTTP clients). Do not invent a passing write path you did not exercise.`
  })}
Live surface:
- CauseStarter: https://causestarter.testnet.commonality.works
- Indexer GraphQL / event cache: see verifier/environments/testnet.json
- Read-only smoke already exists (\`testnet.http\`, \`testnet.website-journeys\`). Mutating canaries already exist (\`testnet.onchain-to-indexer\`, \`testnet.published-data\`). This check is whether *two clients* share one on-chain world through the product UI.

RUBRIC (verbatim — do not rewrite):
-----
${brief}
-----

How to look:
- If this chat has a browser: load CauseStarter, then load it again as a second session (incognito / second user-agent / second fetch of config.json + a listed cause or project). Click around the happy paths. Try suggest/atomize if the AI box is visible.
- You probably cannot inject two funded wallets. That is skipped scope, not a product fail, unless the UI is obviously broken for an unconnected visitor.
- If you have no browser, fetch the live HTML/config and the indexer. Say so under skipped scope. Do not claim a signed two-wallet walk.
- Do not submit mutating transactions unless COMMONALITY_VERIFIER_ENABLE_TESTNET_MUTATION=1 is already the operator intent for this run.

Return ONLY a single JSON object with this exact shape:
{
  "status": "pass" | "uncertain",
  "summary": "one-line summary",
${FILES_READ_FIELD_SPEC}
  "findings": [
    {
      "title": "short title",
      "severity": "high" | "medium" | "low",
      "kind": "broken-lab" | "two-client-gap" | "wallet-gap" | "docs-gap" | "user-judgment",
      "evidence": ["URL, quote, HTTP status, or indexer payload"],
      "recommendation": "concrete next step"
    }
  ],
  "reportMarkdown": "Markdown report with sections: How I looked, First client, Second client, Write path (or why skipped), Findings, Skipped/uncertain scope"
}

Status policy:
- Use "uncertain" if anything is worth human triage (including "I could not sign").
- Use "pass" only if two independent clients saw the same live world and you have no material lab-blocking problems.
- Do not set "fail" yourself; the harness derives gating from finding severities.

Severity:
- "high": a live site/indexer/config failure that would stop Adam and Sam from sharing the lab.
- "medium": two-client visibility is unproven, or a real journey is confusing, but the stack is up.
- "low": polish.`;
}

emit(async () => {
  const params = mergedParams(readInputs());
  const brief = await loadBrief("./testnet-two-person-lab.md");
  const prompt = buildPrompt({ brief });
  const promptArtifact = await writeTextArtifact(
    "prompt.md",
    prompt,
    "text/markdown",
    "Two-person testnet lab briefing."
  );
  const briefArtifact = await writeTextArtifact(
    "rubric.md",
    `${brief}\n`,
    "text/markdown",
    "Verbatim two-person lab rubric."
  );
  const model = resolveModel(params, {
    modelEnvVar: "COMMONALITY_VERIFIER_TWO_PERSON_LAB_MODEL",
    defaultTaskKind: DEFAULT_TASK_KIND
  });

  let llmResult;
  try {
    llmResult = await getLlmResponse(prompt, params, promptArtifact.path, model, {
      fixtureEnvVar: "COMMONALITY_VERIFIER_TWO_PERSON_LAB_FIXTURE_RESPONSE",
      commandEnvVar: "COMMONALITY_VERIFIER_TWO_PERSON_LAB_COMMAND",
      explore: true
    });
  } catch (error) {
    const artifacts = [promptArtifact, briefArtifact];
    if (error?.partialStdout) {
      artifacts.push(await writeTextArtifact("partial-stdout.txt", error.partialStdout, "text/plain", "Stdout before timeout."));
    }
    if (error?.partialStderr) {
      artifacts.push(await writeTextArtifact("partial-stderr.txt", error.partialStderr, "text/plain", "Stderr before timeout."));
    }
    return errorResult(`Could not run two-person lab review: ${error?.message ?? String(error)}`, { artifacts });
  }

  const rawArtifact = await writeTextArtifact("raw-response.txt", llmResult.text, "text/plain", "Raw LLM response.");
  let review;
  try {
    review = validateJudgmentResponse(parseJsonObject(llmResult.text), { arrayFields: ["findings", "filesRead"] });
  } catch (error) {
    return errorResult(`Could not parse two-person lab review: ${error?.message ?? String(error)}`, {
      artifacts: [promptArtifact, briefArtifact, rawArtifact]
    });
  }

  const reportArtifact = await writeTextArtifact(
    "report.md",
    review.reportMarkdown,
    "text/markdown",
    "LLM two-person testnet lab walk."
  );
  const filesReadArtifact = await writeFilesReadArtifact(review.filesRead);
  const findings = {
    filesRead: review.filesRead ?? [],
    findings: review.findings ?? [],
    model: model ?? "command-default",
    usage: llmResult.usage
  };
  const artifacts = [promptArtifact, briefArtifact, rawArtifact, reportArtifact, filesReadArtifact];
  const status = statusFromFindings(review.findings);
  if (status === "fail") return fail(review.summary, { findings, artifacts });
  if (status === "pass") return pass(review.summary, { findings, artifacts });
  return uncertain(review.summary, { findings, artifacts });
});
