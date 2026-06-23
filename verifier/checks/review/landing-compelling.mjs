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

// Standing qualitative-judgment leaf: does the landing/marketing copy actually
// land the product's value proposition, and where is it unconvincing or
// misaligned with what we built? EXPLORATION leaf: the model is briefed on its
// purpose, pointed at the README, and given read-only repo access so it reads the
// founder/value-prop docs (ground truth) and the landing-page source itself,
// rather than judging against a hand-picked, bounded slice. Status maps
// deterministically (pass | uncertain), so the model cannot talk weak copy into a
// pass.

// A landing-copy judgment is a "big-picture-thinking" task; route by kind so the
// check tracks the model-routing table rather than pinning a model string.
const DEFAULT_TASK_KIND = "big-picture-thinking";

function buildPrompt() {
  return `${explorationBriefing({
    role: "skeptical product marketer who understands what Commonality is actually for",
    purpose: `Judge whether Commonality's landing and pitch COPY actually lands the product's real VALUE PROPOSITION: would a prospective user or backer come away convinced, and does the copy match what the product is genuinely for?

To judge alignment rather than just internal polish, first read the product's value proposition from its own docs (the founder/pitch material and the vision-and-strategy docs the README points to), then read the actual landing/marketing copy (the per-domain LandingPage source under ui/src/domains/ and any end-user elevator-pitch / pitch docs). Do not praise; find where the copy is unconvincing, vague, off-message, or misaligned with the value prop.`
  })}
Voice calibration — Commonality's CSM-facing copy aims for a RECOGNITION register, not a PERSUASION one: it assumes the reader is already part of the sane majority and shares the worldview, and uses confident, knowing language that lets the reader recognize "they see it the way I do." It should state what was built, not over-explain why the reader should care, and should NOT lead with the emotional/frustration angle. Flag copy that lapses into preachy persuasion, explains the premise from scratch, leads with frustration, or over-relies on a single mechanism (e.g. "we removed the organizer") rather than the synthesis/flywheel. (If the docs describe a different intended voice, defer to the docs and note the discrepancy.)

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
${FILES_READ_FIELD_SPEC}
  "findings": [
    {
      "title": "short title",
      "severity": "high" | "medium" | "low",
      "kind": "misalignment" | "unconvincing" | "weak-lede" | "voice" | "unfinished" | "docs-gap",
      "evidence": ["specific copy/quote and where it appears"],
      "recommendation": "concrete copy fix"
    }
  ],
  "reportMarkdown": "Markdown report with sections: Scope reviewed, How I briefed myself, Main findings, Suggested fixes, Skipped/uncertain scope"
}

Status policy:
- Use "uncertain" if you find any plausible problem worth human triage.
- Use "pass" only if the copy is compelling and aligned with the value prop and you have no material findings after actively reviewing it.
- Do not set "fail" yourself; the harness derives the gating status from finding severities.

Severity calibration (the harness turns any "high" finding into a deploy-blocking red, "medium"/"low" into advisory yellow):
- "high": the copy misrepresents the value prop, makes an unconvincing/unfinished claim, or violates voice in a way that would lose a target reader.
- "medium": a real weakness (soft lede, vague claim) that dampens but does not break the pitch.
- "low": polish or wording nitpicks.`;
}

emit(async () => {
  const params = mergedParams(readInputs());
  const prompt = buildPrompt();
  const promptArtifact = await writeTextArtifact("prompt.md", prompt, "text/markdown", "Role/purpose briefing supplied to the exploration-mode marketer (the model reads the value-prop docs and landing copy itself).");
  const model = resolveModel(params, {
    modelEnvVar: "COMMONALITY_VERIFIER_LANDING_COMPELLING_MODEL",
    defaultTaskKind: DEFAULT_TASK_KIND
  });

  let rawResponse;
  try {
    rawResponse = await getLlmResponse(prompt, params, promptArtifact.path, model, {
      fixtureEnvVar: "COMMONALITY_VERIFIER_LANDING_COMPELLING_FIXTURE_RESPONSE",
      commandEnvVar: "COMMONALITY_VERIFIER_LANDING_COMPELLING_COMMAND",
      explore: true
    });
  } catch (error) {
    return errorResult(`Could not run landing-compelling review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact] });
  }

  const rawArtifact = await writeTextArtifact("raw-response.txt", rawResponse, "text/plain", "Raw LLM response before JSON parsing.");

  let review;
  try {
    review = validateJudgmentResponse(parseJsonObject(rawResponse), { arrayFields: ["findings", "filesRead"] });
  } catch (error) {
    return errorResult(`Could not parse landing-compelling review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact, rawArtifact] });
  }

  const reportArtifact = await writeTextArtifact("report.md", review.reportMarkdown, "text/markdown", "LLM review of the landing/marketing copy against the product value proposition.");
  const filesReadArtifact = await writeFilesReadArtifact(review.filesRead);
  const findings = {
    filesRead: review.filesRead ?? [],
    findings: review.findings ?? [],
    model: model ?? "command-default"
  };
  const artifacts = [promptArtifact, rawArtifact, reportArtifact, filesReadArtifact];

  const status = statusFromFindings(review.findings);
  if (status === "fail") return fail(review.summary, { findings, artifacts });
  if (status === "pass") return pass(review.summary, { findings, artifacts });
  return uncertain(review.summary, { findings, artifacts });
});
