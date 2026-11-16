import { emit, errorResult, pass, readInputs, uncertain, writeTextArtifact } from "../lib/result.mjs";
import {
  commonalityRoutes,
  FOUNDER_BRIEF_PATH,
  FOUNDER_SIDECAR_PATH,
  parseHeadings,
  readTextInput,
  testTitles,
} from "../lib/founder-ui.mjs";
import {
  getLlmResponse,
  mergedParams,
  parseJsonObject,
  resolveModel,
  validateJudgmentResponse,
  writeFilesReadArtifact,
} from "../lib/llm-judgment.mjs";

// Advisory: has the founder writeup caught up with the Commonality UI, and do
// the conventional tests plausibly cover the sentences he wrote? The model
// must not rewrite the brief. Gaps are uncertain, not a product breach.

const DEFAULT_TASK_KIND = "big-picture-thinking";

function buildPrompt({ brief, sidecar, headings, routes, bindings }) {
  return `You are checking whether a founder-authored UI writeup and its conventional tests are thorough. You are not reviewing whether the product matches the writeup (that is a different check).

Rules:
- The founder brief below is verbatim. Do NOT rewrite, summarize into a replacement spec, or "improve" his wording.
- Tentative wording ("maybe", "I'll fill in later") is not a failure of the writeup. Do not demand he finish tentative sentences.
- A real Commonality page or route that the brief never discusses is an unwritten surface, even if the name does not appear as a string.
- A heading marked untested-on-purpose is an unbound heading, not a wiring bug.
- A heading bound to tests is a weak binding if those test titles do not plausibly exercise the claims in that section. "Page loaded" or an unrelated flow is weak. Say so. Do not invent assertions you were not given.
- Ignore operator-only test-data admin pages.
- Do not propose copy for the brief.

FOUNDER BRIEF (verbatim):
-----
${brief}
-----

HEADINGS:
${JSON.stringify(headings, null, 2)}

SIDECAR (wiring only):
${JSON.stringify(sidecar, null, 2)}

COMMONALITY ROUTES (from the domain manifest, redirects omitted):
${JSON.stringify(routes, null, 2)}

BOUND TEST TITLES:
${JSON.stringify(bindings, null, 2)}

Return ONLY a single JSON object:
{
  "status": "pass" | "uncertain",
  "summary": "one line",
  "filesRead": [],
  "findings": [
    {
      "title": "short title",
      "severity": "high" | "medium" | "low",
      "kind": "unwritten-surface" | "unbound-heading" | "weak-binding",
      "evidence": ["route, heading id, or test title"],
      "recommendation": "what a human should write or what test to add; do not draft replacement prose"
    }
  ],
  "reportMarkdown": "Markdown with sections: Written up, Not written up, Untested on purpose, Weak bindings, Thorough enough?"
}

Status policy:
- "pass" only if the brief discusses the real product surfaces a user hits, and every non-tentative heading is either unbound on purpose for a good reason you agree with or bound to tests that plausibly exercise it.
- Otherwise "uncertain". Never "fail". An incomplete writeup is a gap, not a broken product.`;
}

emit(async () => {
  const inputs = readInputs();
  const params = mergedParams(inputs);
  const brief = await readTextInput(inputs, "founderBrief", FOUNDER_BRIEF_PATH);
  const sidecar = JSON.parse(await readTextInput(inputs, "founderSidecar", FOUNDER_SIDECAR_PATH));
  const headings = parseHeadings(brief);
  const routes = await commonalityRoutes();
  const bindings = [];
  for (const entry of sidecar.headings ?? []) {
    if (entry.disposition !== "tests") continue;
    for (const testFile of entry.tests ?? []) {
      bindings.push({ headingId: entry.id, testFile, titles: await testTitles(testFile) });
    }
  }

  const prompt = buildPrompt({ brief, sidecar, headings, routes, bindings });
  const promptArtifact = await writeTextArtifact("prompt.md", prompt, "text/markdown", "Thoroughness prompt. Includes the verbatim founder brief.");
  const model = resolveModel(params, {
    modelEnvVar: "COMMONALITY_VERIFIER_FOUNDER_UI_THOROUGHNESS_MODEL",
    defaultTaskKind: DEFAULT_TASK_KIND,
  });

  let llmResult;
  try {
    llmResult = await getLlmResponse(prompt, params, promptArtifact.path, model, {
      fixtureEnvVar: "COMMONALITY_VERIFIER_FOUNDER_UI_THOROUGHNESS_FIXTURE_RESPONSE",
      commandEnvVar: "COMMONALITY_VERIFIER_FOUNDER_UI_THOROUGHNESS_COMMAND",
      explore: false,
    });
  } catch (error) {
    return errorResult(`Could not run founder-UI thoroughness review: ${error?.message ?? String(error)}`, {
      artifacts: [promptArtifact],
    });
  }

  const rawArtifact = await writeTextArtifact("raw-response.txt", llmResult.text, "text/plain", "Raw LLM response before JSON parsing.");
  let review;
  try {
    review = validateJudgmentResponse(parseJsonObject(llmResult.text), { arrayFields: ["findings", "filesRead"] });
  } catch (error) {
    return errorResult(`Could not parse founder-UI thoroughness review: ${error?.message ?? String(error)}`, {
      artifacts: [promptArtifact, rawArtifact],
    });
  }

  const reportArtifact = await writeTextArtifact(
    "report.md",
    review.reportMarkdown,
    "text/markdown",
    "Whether the founder writeup and conventional tests are thorough. Does not rewrite the brief.",
  );
  const filesReadArtifact = await writeFilesReadArtifact(review.filesRead);
  const findings = {
    headings: headings.map((heading) => heading.id),
    routeCount: routes.length,
    findings: review.findings ?? [],
    model: model ?? "command-default",
    usage: llmResult.usage,
  };
  const artifacts = [promptArtifact, rawArtifact, reportArtifact, filesReadArtifact];
  const gaps = (review.findings ?? []).length;
  if (review.status === "pass" && gaps === 0) {
    return pass(review.summary, { findings, artifacts });
  }
  return uncertain(review.summary || `Founder UI thoroughness has ${gaps} gap(s).`, { findings, artifacts });
});
