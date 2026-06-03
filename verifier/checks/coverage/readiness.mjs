import { emit, fail, pass, readInputs, writeTextArtifact } from "../lib/result.mjs";

// Reporting/aggregation leaf: turns the per-gap readiness metadata already in
// coverage/testing-plan-items.json (targetConfidence, severity, status,
// nextAction, owner) into a single "what remains before each confidence tier"
// narrative, so a human or the dashboard can answer "what needs to happen before
// we can go live" without reading the raw inventory. This is a complement to
// staleness.known-gaps (which checks the metadata is present/fresh per item):
// readiness rolls the same metadata up by tier. Its one failure mode is a gap it
// cannot place in a tier, because that leaves the readiness narrative incomplete.

// Confidence tiers in increasing order of how much must be true. A gap whose
// targetConfidence is a given tier must be resolved before that tier is claimed.
const TIER_ORDER = ["pr", "light-confidence", "release-candidate", "full-launch"];
const SEVERITY_ORDER = { blocker: 0, high: 1, medium: 2, low: 3, info: 4 };
const OPEN_STATUSES = new Set(["open", "in-progress", "deferred"]);

function findFileInput(inputs, inputName) {
  return inputs.find((input) => input.kind === "file" && (input.as === inputName || input.path?.endsWith(inputName)));
}

function parseInventory(input) {
  if (!input) throw new Error("Missing testing-plan inventory file input.");
  if (input.content === null || input.content === undefined) throw new Error(`Could not read inventory file: ${input.path}`);
  const inventory = JSON.parse(input.content);
  if (!Array.isArray(inventory.items)) throw new Error("Inventory must contain an items array.");
  return inventory;
}

function severityRank(severity) {
  return SEVERITY_ORDER[severity] ?? SEVERITY_ORDER.info;
}

function summarizeGap(item) {
  return {
    id: item.id,
    title: item.title,
    severity: item.severity ?? "unknown",
    status: item.status ?? "unknown",
    owner: item.owner,
    targetConfidence: item.targetConfidence,
    nextAction: item.nextAction
  };
}

function buildReportMarkdown(tiers, alwaysManual, unplaceable, now) {
  const lines = [`# Go-live readiness — ${now}`, ""];
  lines.push("Open known-gaps grouped by the confidence tier they must clear before it can be claimed. Derived from `coverage/testing-plan-items.json`.", "");

  for (const tier of TIER_ORDER) {
    const gaps = tiers.get(tier) ?? [];
    lines.push(`## Before \`${tier}\` — ${gaps.length} open gap(s)`, "");
    if (gaps.length === 0) {
      lines.push("_No open gaps blocking this tier._", "");
      continue;
    }
    for (const gap of gaps) {
      lines.push(`- **${gap.title}** (\`${gap.id}\`, ${gap.severity}, ${gap.status}, owner: ${gap.owner ?? "unassigned"})`);
      if (gap.nextAction) lines.push(`  - Next: ${gap.nextAction}`);
    }
    lines.push("");
  }

  lines.push("## Always-manual / attested (will not be automated away)", "");
  if (alwaysManual.length === 0) {
    lines.push("_None._", "");
  } else {
    for (const item of alwaysManual) lines.push(`- **${item.title}** (\`${item.id}\`, ${item.coverage})`);
    lines.push("");
  }

  if (unplaceable.length > 0) {
    lines.push("## ⚠️ Gaps with no target tier (readiness incomplete)", "");
    for (const item of unplaceable) lines.push(`- **${item.title}** (\`${item.id}\`) — set targetConfidence to one of: ${TIER_ORDER.join(", ")}`);
    lines.push("");
  }

  return lines.join("\n");
}

emit(async () => {
  const inventory = parseInventory(findFileInput(readInputs(), "testingPlanItems"));
  const items = inventory.items;

  const openGaps = items.filter((item) => item.coverage === "known-gap" && OPEN_STATUSES.has(item.status));
  const alwaysManual = items
    .filter((item) => item.coverage === "intentionally-manual" || item.coverage === "report-attestation")
    .map((item) => ({ id: item.id, title: item.title, coverage: item.coverage }));

  const tiers = new Map(TIER_ORDER.map((tier) => [tier, []]));
  const unplaceable = [];
  for (const gap of openGaps) {
    const tier = gap.targetConfidence;
    if (typeof tier !== "string" || !tiers.has(tier)) {
      unplaceable.push({ id: gap.id, title: gap.title });
      continue;
    }
    tiers.get(tier).push(gap);
  }
  for (const tier of TIER_ORDER) {
    tiers.get(tier).sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  }

  const now = new Date().toISOString().slice(0, 10);
  const tierCounts = Object.fromEntries(TIER_ORDER.map((tier) => [tier, tiers.get(tier).length]));
  const reportMarkdown = buildReportMarkdown(
    new Map(TIER_ORDER.map((tier) => [tier, tiers.get(tier).map(summarizeGap)])),
    alwaysManual,
    unplaceable,
    now
  );
  const reportArtifact = await writeTextArtifact("readiness.md", reportMarkdown, "text/markdown", "Go-live readiness narrative grouped by confidence tier.");

  const findings = {
    source: inventory.source,
    openGapCount: openGaps.length,
    tierCounts,
    byTier: Object.fromEntries(TIER_ORDER.map((tier) => [tier, tiers.get(tier).map(summarizeGap)])),
    alwaysManual,
    unplaceable
  };

  if (unplaceable.length > 0) {
    return fail(
      `${unplaceable.length} open known-gap(s) have no targetConfidence tier, so the readiness narrative is incomplete.`,
      { findings, artifacts: [reportArtifact] }
    );
  }

  const blocking = tierCounts["pr"] + tierCounts["light-confidence"] + tierCounts["release-candidate"];
  return pass(
    `Readiness: ${blocking} open gap(s) before release-candidate, ${tierCounts["full-launch"]} more before full-launch.`,
    { findings, artifacts: [reportArtifact] }
  );
});
