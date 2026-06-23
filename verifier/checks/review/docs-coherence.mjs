import { readFile, stat } from "node:fs/promises";
import { dirname, resolve, extname } from "node:path";
import { emit, errorResult, fail, pass, readInputs, truncate, uncertain, workspacePath, writeTextArtifact } from "../lib/result.mjs";
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

// Standing qualitative-judgment leaf: asks a model to form an opinion over the
// product/docs surface and flag incoherence, contradictions, and stale
// instructions. EXPLORATION leaf: the model is briefed on its purpose, pointed at
// the README, and given read-only repo access so it reads the docs hierarchy
// itself rather than judging a bounded, hand-picked slice. A cheap deterministic
// broken-link scan over a known doc set still runs alongside it. Gating leaf in
// facet.docs: status is derived deterministically from the structured findings'
// severities (statusFromFindings) — any "high" finding turns it red, lesser
// findings make it uncertain — so the model can neither talk a gap into a pass
// nor downgrade a high-severity finding.

// The doc set scanned by the DETERMINISTIC broken-link check below (not the LLM
// prompt — the model explores the docs itself). Kept explicit so the static scan
// stays cheap and reviewable.
const DEFAULT_INPUT_FILES = [
  "../README.md",
  "../CONTINUITY.md",
  "../TODO.md",
  "../workflow/task-tiers.md",
  "../inbox.md",
  "README.md",
  "../workflow/project-status.md",
  "../specs/user-docs.md",
  "../workflow/reviews/README.md",
  "../workflow/branching.md",
  "../testnet-prep.md",
  "../AGENTS.md",
  "../docs/dev/architecture.md",
  "../hardhat/README.md",
  "../sdk/README.md",
  "../indexer/README.md",
  "../integration-tests/README.md",
  "../fake-data-generation/README.md",
  "../attester-core/README.md",
  "../implication-attester/README.md",
  "../content-attester/README.md",
  "../finder-core/README.md",
  "../implication-finder/README.md",
  "../content-finder/README.md",
  "../nudger-core/README.md",
  "../implication-graph-nudger/README.md",
  "../bridge-creator/README.md",
  "../explorer-curator/README.md",
  "../beat-agent/README.md",
  "../service-host/README.md",
  "../platform-api-service/README.md",
  "../ui/test-plan.md",
  "../docs/end-user/tldr-for-llms.md",
  "../docs/founder/christian-pitch.md",
  "../docs/end-user/common-sense-majority/trust-model.md",
  "../docs/end-user/common-sense-majority/mediator.md",
  "../docs/end-user/lazyGiving/assurance-contracts.md",
  "../docs/end-user/lazyGiving/retroactive-funding.md",
  "../docs/end-user/commonality/how-actions-compound.md",
  "../ui/README.md",
  "../workflow/roles/README.md",
  "../workflow/roles/developer.md",
  "../workflow/roles/end-user.md",
  "../workflow/roles/founder.md",
  "../workflow/roles/product-manager.md",
  "../workflow/roles/tech-lead.md",
  "../workflow/local-development.md",
  "../workflow/build.md",
  "../workflow/deployment.md",
  "../workflow/commonality-works-setup.md",
  "../workflow/hostinger-dns-setup.md",
  "../workflow/reviews/before-testnet.md",
  "DESIGN.md",
  "PLAN.md",
  "../specs/README.md",
  "../specs/product/ui-domains.md",
  "../specs/product/ai-assistance.md",
  "../specs/product/bridge-creator.md",
  "../specs/tech/README.md",
  "../specs/tech/ui-domains.md",
  "../specs/tech/indexer/README.md",
  "../specs/tech/service-bundling.md",
  "../specs/tech/subsystems/subjectiv/README.md",
  "../specs/tech/subsystems/conceptspace/README.md",
  "../specs/tech/subsystems/conceptspace/statements.md",
  "../specs/tech/subsystems/conceptspace/displayable-documents.md",
  "../specs/tech/subsystems/conceptspace/statement-discovery.md",
  "../specs/tech/subsystems/conceptspace/queries-and-actions.md",
  "../specs/tech/subsystems/conceptspace/ui.md",
  "../specs/tech/subsystems/conceptspace/nudges.md",
  "../specs/tech/subsystems/conceptspace/implication-attester-ai-prompt.md",
  "../specs/tech/subsystems/lazyGiving/README.md",
  "../specs/tech/subsystems/nudger/README.md",
  "../specs/tech/subsystems/content-funding/canonicalization.md",
  "../specs/tech/subsystems/content-funding/channel-claiming.md",
  "../specs/tech/subsystems/content-funding/content-registry.md",
  "../specs/tech/subsystems/content-funding/content-attesters.md",
  "../specs/tech/subsystems/conceptspace/implication-attester-ai.md",
  "../specs/tech/subsystems/fundingportals/README.md",
  "../specs/tech/subsystems/content-funding/noninflammatory-content/beat-agents.md",
  "../specs/tech/subsystems/content-funding/platform-api-service.md",
  "../specs/tech/subsystems/conceptspace/explorer.md",
  "../workflow/reviews/smart-contract-audit-2026-05-07.md",
  "../docs/end-user/tally/statements-and-implication-graph.md",
  "../docs/end-user/shared/key-ideas/README.md",
  "../docs/end-user/commonality/vision-and-strategy/README.md",
  "../docs/end-user/commonality/vision-and-strategy/credible-solution/README.md",
  "../docs/end-user/commonality/vision-and-strategy/credible-solution/assurance-contracts.md",
  "../docs/end-user/commonality/vision-and-strategy/credible-solution/delegation.md",
  "../docs/end-user/commonality/vision-and-strategy/getting-people-to-switch.md",
  "../docs/end-user/commonality/vision-and-strategy/hard-to-stop/README.md",
  "../docs/end-user/commonality/vision-and-strategy/hard-to-stop/credible-threat.md",
  "../docs/end-user/commonality/vision-and-strategy/so-what/README.md",
  "../docs/end-user/commonality/vision-and-strategy/so-what/enthusiastic-adoption.md",
  "../docs/end-user/commonality/vision-and-strategy/so-what/easier-than-politics.md",
  "../docs/end-user/commonality/vision-and-strategy/so-what/local-government.md",
  "../docs/end-user/commonality/vision-and-strategy/why-its-better/README.md",
  "../docs/end-user/commonality/vision-and-strategy/why-its-better/organic-coalitions.md",
  "../docs/end-user/commonality/vision-and-strategy/why-its-better/retroactive-funding.md",
  "../docs/end-user/commonality/vision-and-strategy/hard-to-stop/censorship-resistance.md",
  "../docs/end-user/commonality/vision-and-strategy/pitches.md",
  "../docs/end-user/commonality/vision-and-strategy/ethics.md",
  "../.env.example",
  "../ui/.env.example"
];

// A docs-coherence judgment is a "clear-communication" task; route by kind so the
// check tracks the model-routing table rather than pinning a model string.
const DEFAULT_TASK_KIND = "clear-communication";

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

// Extracts markdown link targets that look like local file references (no scheme, not anchors-only).
function extractLocalLinks(content) {
  const links = [];
  // Matches [text](target) — captures the target
  for (const match of content.matchAll(/\[(?:[^\]]*)\]\(([^)#][^)]*)\)/g)) {
    const target = match[1].split("#")[0].trim(); // strip fragment
    if (target && !target.includes("://") && !target.startsWith("mailto:")) {
      links.push(target);
    }
  }
  return links;
}

// Checks markdown links in the surface files and returns findings for targets that don't exist on disk.
async function checkBrokenRefs(files) {
  // Links starting with "/" are repo-root-relative in this codebase's docs convention.
  const repoRoot = resolve(workspacePath(), "..");
  const findings = [];
  for (const file of files) {
    if (file.missing || !file.content) continue;
    const fileAbsPath = workspacePath(file.relativePath);
    const fileDir = dirname(fileAbsPath);
    const links = extractLocalLinks(file.content);
    for (const link of links) {
      // Only check .md files; skip directory links and non-md extensions
      if (link.endsWith("/")) continue;
      const ext = extname(link);
      if (ext && ext !== ".md") continue;
      // Links starting with "/" may be filesystem-absolute or repo-root-relative.
      // Check filesystem-absolute first; if that exists it's a real absolute path reference.
      // Otherwise treat as repo-root-relative (common convention in this project's docs).
      let absTarget;
      if (link.startsWith("/")) {
        absTarget = await exists(link) ? link : resolve(repoRoot, link.slice(1));
      } else {
        absTarget = resolve(fileDir, link);
      }
      if (!await exists(absTarget)) {
        findings.push({
          title: `Broken reference in ${file.relativePath}`,
          severity: "medium",
          kind: "broken-reference",
          evidence: [`\`${file.relativePath}\` links to \`${link}\` which does not exist on disk.`],
          recommendation: `Either create the missing file or remove the link from \`${file.relativePath}\`.`
        });
      }
    }
  }
  return findings;
}

async function collectDocInputs(params) {
  const maxFileChars = Number(params.maxFileChars ?? 60000);
  const files = [];
  for (const relativePath of params.inputFiles ?? DEFAULT_INPUT_FILES) {
    const absolutePath = workspacePath(relativePath);
    if (await exists(absolutePath)) {
      files.push({ relativePath, content: truncate(await readFile(absolutePath, "utf8"), maxFileChars) });
    } else {
      files.push({ relativePath, missing: true });
    }
  }
  return files;
}

function buildPrompt() {
  return `${explorationBriefing({
    role: "skeptical technical editor and demanding newcomer who must act on the project's documentation",
    purpose: `Judge whether Commonality's documentation makes sense *together* as a description of one product. Read the docs hierarchy starting from the README — the navigation pages, the role-based guidance, the product/tech specs, and the per-component READMEs it points to — and find where they fail to cohere. Do not praise; find problems, reading as a newcomer who must follow these instructions.`
  })}
Look for:
- internal contradictions (two docs describing the same thing differently);
- stale instructions (commands, paths, env vars, or flows that no longer match what other docs — or the actual repo — describe);
- conceptual incoherence (terms used inconsistently, undefined jargon, a value proposition that shifts between documents);
- broken or dangling references (a doc links to a file that does not exist); you can verify link targets with the read/ls/find tools;
- instructions a newcomer could not actually follow to completion.

Notes:
- Treat \`CONTINUITY.md\` as historical change notes, not canonical current instructions, unless a current navigation page points readers to a stale entry as current guidance.
- A cheap deterministic broken-link scan also runs alongside you; you do not need to exhaustively re-check every link, but do report broken references you encounter while reading.

Return ONLY a single JSON object with this exact shape:
{
  "status": "pass" | "uncertain",
  "summary": "one-line summary",
${FILES_READ_FIELD_SPEC}
  "findings": [
    {
      "title": "short title",
      "severity": "high" | "medium" | "low",
      "kind": "contradiction" | "stale" | "incoherence" | "broken-reference" | "unfollowable",
      "evidence": ["specific doc/section/quote evidence"],
      "recommendation": "concrete doc fix"
    }
  ],
  "reportMarkdown": "Markdown report with sections: Scope reviewed, How I briefed myself, Main findings, Suggested fixes, Skipped/uncertain scope"
}

Status policy:
- Use "uncertain" if you find any plausible coherence problem needing human triage.
- Use "pass" only if the docs you read are coherent and you have no material findings after actively reviewing them.
- Do not set "fail" yourself; the harness derives the gating status from finding severities.

Severity calibration (the harness turns any "high" finding into a deploy-blocking red, "medium"/"low" into advisory yellow):
- "high": a contradiction or broken instruction that would actively mislead a newcomer or block them from completing a documented flow.
- "medium": real incoherence or staleness that causes confusion but has a workaround.
- "low": polish, wording, or minor drift.`;
}

emit(async () => {
  const params = mergedParams(readInputs());
  const files = await collectDocInputs(params);
  const brokenRefFindings = await checkBrokenRefs(files);
  const prompt = buildPrompt();
  const promptArtifact = await writeTextArtifact("prompt.md", prompt, "text/markdown", "Role/purpose briefing supplied to the exploration-mode docs editor (the model reads the docs hierarchy itself).");
  const model = resolveModel(params, {
    modelEnvVar: "COMMONALITY_VERIFIER_DOCS_COHERENCE_MODEL",
    defaultTaskKind: DEFAULT_TASK_KIND
  });

  let rawResponse;
  try {
    rawResponse = await getLlmResponse(prompt, params, promptArtifact.path, model, {
      fixtureEnvVar: "COMMONALITY_VERIFIER_DOCS_COHERENCE_FIXTURE_RESPONSE",
      commandEnvVar: "COMMONALITY_VERIFIER_DOCS_COHERENCE_COMMAND",
      explore: true
    });
  } catch (error) {
    return errorResult(`Could not run docs-coherence review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact] });
  }

  const rawArtifact = await writeTextArtifact("raw-response.txt", rawResponse, "text/plain", "Raw LLM response before JSON parsing.");

  let review;
  try {
    review = validateJudgmentResponse(parseJsonObject(rawResponse), { arrayFields: ["findings", "filesRead"] });
  } catch (error) {
    return errorResult(`Could not parse docs-coherence review: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact, rawArtifact] });
  }

  const reportArtifact = await writeTextArtifact("report.md", review.reportMarkdown, "text/markdown", "LLM coherence review of the product documentation surface.");
  const filesReadArtifact = await writeFilesReadArtifact(review.filesRead);
  const allFindings = [...brokenRefFindings, ...(review.findings ?? [])];
  const findings = {
    staticallyScannedFiles: files.map((file) => ({ path: file.relativePath, missing: Boolean(file.missing) })),
    filesRead: review.filesRead ?? [],
    findings: allFindings,
    model: model ?? "command-default"
  };
  const artifacts = [promptArtifact, rawArtifact, reportArtifact, filesReadArtifact];

  const status = statusFromFindings(allFindings);
  const summary = brokenRefFindings.length > 0
    ? `${brokenRefFindings.length} broken ref(s) detected by static check; LLM review: ${review.summary}`
    : review.summary;
  if (status === "fail") return fail(summary, { findings, artifacts });
  if (status === "pass") return pass(summary, { findings, artifacts });
  return uncertain(summary, { findings, artifacts });
});
