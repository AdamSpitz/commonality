import { readFile } from "node:fs/promises";
import path from "node:path";
import { derivePageInventory } from "../lib/page-inventory.mjs";
import { emit, errorResult, fail, pass, readInputs, truncate, uncertain, workspacePath, writeTextArtifact } from "../lib/result.mjs";
import { getLlmResponse, mergedParams, parseJsonObject, resolveModel, statusFromFindings, validateJudgmentResponse } from "../lib/llm-judgment.mjs";

// Manual/cost-guarded LLM leaf: samples the derived UI page inventory and asks
// whether each page appears usable by a first-time user. This intentionally
// reuses the same source-derived page loop as review.page-links, but swaps
// deterministic route resolution for a bounded model judgment.

const EXTENSION_CANDIDATES = ["", ".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts"];
const DEFAULT_TASK_KIND = "clear-communication";

async function resolveModuleFile(baseDir, specifier) {
  if (!specifier) return null;
  for (const suffix of EXTENSION_CANDIDATES) {
    const candidate = path.resolve(baseDir, specifier + suffix);
    try {
      await readFile(candidate, "utf8");
      return candidate;
    } catch {
      // try next extension candidate
    }
  }
  return null;
}

function selectPages(inventory, params) {
  const includeDomains = new Set(params.domains ?? []);
  const excludeRedirects = params.excludeRedirects ?? true;
  const all = [];
  for (const domain of inventory.domains) {
    if (includeDomains.size > 0 && !includeDomains.has(domain.id) && !includeDomains.has(domain.kebabId)) continue;
    for (const route of domain.routes) {
      if (excludeRedirects && route.element.kind === "redirect") continue;
      all.push({ domain, route });
    }
  }

  const maxPages = Number(params.maxPages ?? 10);
  return all.slice(0, Math.max(1, maxPages));
}

async function collectPageSource(page, maxFileChars) {
  const manifestDir = path.dirname(page.domain.manifestFile);
  const componentFile = await resolveModuleFile(manifestDir, page.route.element.importSpecifier);
  const manifestRelative = path.relative(workspacePath(".."), page.domain.manifestFile);
  if (!componentFile) {
    return {
      domain: page.domain.id,
      routePath: page.route.path,
      manifestFile: manifestRelative,
      componentFile: null,
      element: page.route.element,
      source: "<component source unavailable: route element could not be resolved>"
    };
  }
  return {
    domain: page.domain.id,
    routePath: page.route.path,
    manifestFile: manifestRelative,
    componentFile: path.relative(workspacePath(".."), componentFile),
    element: { kind: page.route.element.kind, exportName: page.route.element.exportName },
    source: truncate(await readFile(componentFile, "utf8"), maxFileChars)
  };
}

function renderPages(pages) {
  return pages.map((page, index) => `## Page ${index + 1}: ${page.domain} ${page.routePath}\n\nManifest: ${page.manifestFile}\nComponent: ${page.componentFile ?? "unresolved"}\nElement: ${JSON.stringify(page.element)}\n\n\`\`\`tsx\n${page.source}\n\`\`\``).join("\n\n---\n\n");
}

function buildPrompt({ inventory, pages, params }) {
  return `You are an adversarial UX reviewer for Commonality. Review the bounded set of UI page component sources below and decide whether each page appears usable by a first-time user trying to accomplish the page's apparent purpose.

Scope and guardrails:
- The page inventory was derived from ${inventory.source}; this run reviews ${pages.length} sampled page(s), not the whole product.
- Judge source-visible interaction flow: primary actions, navigation choices, form fields, loading/error/empty states, disabled-state explanations, and whether the user can tell what to do next.
- Do not complain about purely visual polish, brand taste, or implementation details unless they create a concrete usability problem.
- Name skipped/uncertain scope explicitly: dynamic child components, fetched content, wallet/provider runtime behavior, and pages beyond the sample may be out of scope.

Look for:
- pages with no obvious primary task or next action;
- forms that can be submitted incorrectly or lack confirmation/recovery paths;
- actions that require prior context, wallet state, or permissions without guidance;
- loading, empty, or error states that strand the user;
- navigation traps, missing back/escape paths, or CTAs that lead away unexpectedly.

Return ONLY a single JSON object with this exact shape:
{
  "status": "pass" | "uncertain" | "fail",
  "summary": "one-line summary",
  "findings": [
    {
      "title": "short title",
      "severity": "high" | "medium" | "low",
      "domain": "domain id",
      "routePath": "route path",
      "evidence": ["specific quote or source-location clue"],
      "recommendation": "concrete UX fix"
    }
  ],
  "reportMarkdown": "Markdown report with sections: Scope reviewed, Findings by page, Suggested fixes, Skipped/uncertain scope"
}

Status policy:
- High severity findings are concrete launch-blocking usability problems and deterministically make this check fail.
- Medium/low findings make this check uncertain.
- Pass only if the sampled pages are usable enough for a first-time user, while still noting skipped scope in the report.

Optional reviewer notes from params: ${params.reviewerNotes ?? "<none>"}

PAGES UNDER REVIEW:

${renderPages(pages)}`;
}

emit(async () => {
  const params = mergedParams(readInputs());
  const inventory = await derivePageInventory();
  const selected = selectPages(inventory, params);
  const maxFileChars = Number(params.maxFileChars ?? 25000);
  const pages = [];
  for (const page of selected) pages.push(await collectPageSource(page, maxFileChars));

  const prompt = buildPrompt({ inventory, pages, params });
  const promptArtifact = await writeTextArtifact("prompt.md", prompt, "text/markdown", "Prompt and sampled page sources supplied to the LLM usability reviewer.");
  const model = resolveModel(params, {
    modelEnvVar: "COMMONALITY_VERIFIER_PAGE_USABILITY_MODEL",
    defaultTaskKind: DEFAULT_TASK_KIND
  });

  let rawResponse;
  let usage = null;
  let llmResult;
  try {
    llmResult = await getLlmResponse(prompt, params, promptArtifact.path, model, {
      fixtureEnvVar: "COMMONALITY_VERIFIER_PAGE_USABILITY_FIXTURE_RESPONSE",
      commandEnvVar: "COMMONALITY_VERIFIER_PAGE_USABILITY_COMMAND"
    });
  } catch (error) {
    return errorResult(`Could not run page usability review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact] });
  }

  rawResponse = llmResult.text;
  usage = llmResult.usage;
  const rawArtifact = await writeTextArtifact("raw-response.txt", rawResponse, "text/plain", "Raw LLM response before JSON parsing.");
  let review;
  try {
    review = validateJudgmentResponse(parseJsonObject(rawResponse), { validStatuses: ["pass", "uncertain", "fail"], arrayFields: ["findings"] });
  } catch (error) {
    return errorResult(`Could not parse page usability review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact, rawArtifact] });
  }

  const reportArtifact = await writeTextArtifact("report.md", review.reportMarkdown, "text/markdown", "LLM review of whether sampled pages appear usable by first-time users.");
  const findings = {
    inventorySource: inventory.source,
    sampledPages: pages.map((page) => ({ domain: page.domain, routePath: page.routePath, componentFile: page.componentFile })),
    totalDerivedPages: inventory.domains.reduce((sum, domain) => sum + domain.routes.length, 0),
    sampleLimit: Number(params.maxPages ?? 10),
    findings: review.findings ?? [],
    model: model ?? "command-default",
    usage
  };
  const artifacts = [promptArtifact, rawArtifact, reportArtifact];
  const status = statusFromFindings(review.findings);
  if (status === "fail") return fail(review.summary, { findings, artifacts });
  if (status === "pass") return pass(review.summary, { findings, artifacts });
  return uncertain(review.summary, { findings, artifacts });
});
