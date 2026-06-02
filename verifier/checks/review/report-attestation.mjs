import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { emit, fail, pass, readInputs, uncertain, workspacePath } from "../lib/result.mjs";

const REQUIRED_SECTIONS = [
  "Scope actually covered",
  "Evidence I used the system / inspected the code or docs",
  "Attempts to break it",
  "Highest-severity finding",
  "Other findings",
  "Where I used insider knowledge or gave benefit of the doubt",
  "Confidence: low / medium / high",
  "Recommended follow-up tests or automation"
];

function paramsInput(inputs) {
  return Object.assign({}, ...inputs.filter((input) => input.kind === "params").map((input) => input.data ?? {}));
}

async function markdownFiles(rootDir) {
  const files = [];

  async function visit(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (e) {
      if (e.code === "ENOENT") return;
      throw e;
    }

    await Promise.all(entries.map(async (entry) => {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
        return;
      }
      if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md") files.push(entryPath);
    }));
  }

  await visit(rootDir);
  return files;
}

function includesAllTokens(text, tokens) {
  const lower = text.toLowerCase();
  return tokens.every((token) => lower.includes(String(token).toLowerCase()));
}

async function candidateReports({ searchRoot, filenameIncludes = [], contentIncludes = [] }) {
  const root = workspacePath(searchRoot ?? "../workflow/reviews/manual-validation");
  const files = await markdownFiles(root);
  const candidates = [];

  for (const file of files) {
    const content = await readFile(file, "utf8");
    const basename = path.basename(file).toLowerCase();
    if (!includesAllTokens(basename, filenameIncludes)) continue;
    if (!includesAllTokens(content, contentIncludes)) continue;
    const fileStat = await stat(file);
    candidates.push({ path: file, content, mtimeMs: fileStat.mtimeMs });
  }

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates;
}

function sectionRegex(section) {
  const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^##\\s+${escaped}\\s*$`, "im");
}

function sectionBody(content, section) {
  const heading = sectionRegex(section).exec(content);
  if (!heading) return null;
  const start = heading.index + heading[0].length;
  const rest = content.slice(start);
  const next = /^##\s+/m.exec(rest);
  return (next ? rest.slice(0, next.index) : rest).trim();
}

function validateSections(content) {
  return REQUIRED_SECTIONS.map((section) => {
    const body = sectionBody(content, section);
    return {
      section,
      present: body !== null,
      nonEmpty: Boolean(body && body.length > 0)
    };
  });
}

function reportDate(content, fileMtimeMs) {
  const match = content.match(/(?:date|timestamp|report)[^\n]*?(20\d{2}-\d{2}-\d{2})/i) ?? content.match(/(20\d{2}-\d{2}-\d{2})/);
  if (!match) return new Date(fileMtimeMs);
  const parsed = new Date(`${match[1]}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? new Date(fileMtimeMs) : parsed;
}

function daysSince(date) {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function blockingFinding(content) {
  const highest = sectionBody(content, "Highest-severity finding") ?? "";
  const confidence = sectionBody(content, "Confidence: low / medium / high") ?? "";
  const text = `${highest}\n${confidence}`.toLowerCase();

  if (/\b(no|none|n\/a)\b/.test(highest.toLowerCase()) && !/\bblocker\b|\bcritical\b|\bhigh\b|severe/.test(highest.toLowerCase())) {
    return null;
  }

  if (/unresolved/.test(text) && (/\bblocker\b|\bcritical\b|severe/.test(text) || /high[- ]confidence/.test(text))) {
    return "Highest-severity finding appears to name an unresolved blocker/high-confidence severe issue.";
  }
  if (/\bblocker\b|\bcritical\b/.test(text)) {
    return "Highest-severity finding appears to name a blocker/critical issue.";
  }
  if (/high[- ]confidence/.test(text) && /\b(high|severe|major)\b/.test(text)) {
    return "Highest-severity finding appears to name a high-confidence severe issue.";
  }
  return null;
}

function statusForProblem(problemKind, policy) {
  return policy?.[problemKind] ?? "uncertain";
}

function makeProblemResult(status, summary, findings) {
  if (status === "fail") return fail(summary, { findings });
  return uncertain(summary, { findings });
}

emit(async () => {
  const params = paramsInput(readInputs());
  const label = params.label ?? process.env.VERIFIER_CHECK_ID ?? "report attestation";
  const maxAgeDays = Number(params.maxAgeDays ?? 30);
  const policy = params.statusPolicy ?? {};
  const candidates = await candidateReports(params);

  const baseFindings = {
    label,
    searchRoot: params.searchRoot ?? "../workflow/reviews/manual-validation",
    filenameIncludes: params.filenameIncludes ?? [],
    contentIncludes: params.contentIncludes ?? [],
    maxAgeDays,
    requiredSections: REQUIRED_SECTIONS
  };

  if (candidates.length === 0) {
    const status = statusForProblem("missing", policy);
    return makeProblemResult(status, `${label}: no matching report found.`, { ...baseFindings, problem: "missing-report" });
  }

  const report = candidates[0];
  const sections = validateSections(report.content);
  const missingSections = sections.filter((section) => !section.present).map((section) => section.section);
  const emptySections = sections.filter((section) => section.present && !section.nonEmpty).map((section) => section.section);
  const date = reportDate(report.content, report.mtimeMs);
  const ageDays = daysSince(date);
  const blocker = blockingFinding(report.content);
  const findings = {
    ...baseFindings,
    reportPath: path.relative(workspacePath(".."), report.path),
    reportDate: date.toISOString().slice(0, 10),
    ageDays,
    sections,
    missingSections,
    emptySections,
    blocker
  };

  if (blocker) {
    return fail(`${label}: report names a blocking severe finding.`, { findings });
  }

  if (missingSections.length > 0 || emptySections.length > 0) {
    const status = statusForProblem("incomplete", policy);
    return makeProblemResult(status, `${label}: report is incomplete (${missingSections.length} missing, ${emptySections.length} empty section(s)).`, findings);
  }

  if (ageDays > maxAgeDays) {
    const status = statusForProblem("stale", policy);
    return makeProblemResult(status, `${label}: report is stale (${ageDays}d old, max ${maxAgeDays}d).`, findings);
  }

  return pass(`${label}: complete fresh report found (${ageDays}d old).`, { findings });
});
