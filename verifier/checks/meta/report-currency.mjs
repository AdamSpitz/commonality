import { readdir, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { emit, errorResult, pass, readInputs, truncate, uncertain, workspacePath, writeTextArtifact } from "../lib/result.mjs";
import { getLlmResponse, mergedParams, parseJsonObject, resolveModel, validateJudgmentResponse } from "../lib/llm-judgment.mjs";

// "Is the latest report still good, or should I re-run some checks?" — answered
// the way a founder answers it in their head: some combination of time-elapsed
// and what-work-has-landed. Time-elapsed is already handled by every check's own
// cadence; this leaf adds the work-landed half.
//
// Rather than maintain a brittle per-check path map, it lets a cheap model read
// the commits landed since this leaf last looked and judge which checks/facets
// they plausibly invalidate. That is safe because neither error mode is costly:
// a false positive only regenerates a report unnecessarily (and the watermark
// then advances, so it won't re-fire on the same commits), and a false negative
// leaves us no worse than today — the elapsed-time cadence still sweeps it up.
//
// It records the commit it evaluated up to (the watermark) in its own findings.
// On the next run, if HEAD has not moved past that watermark, it answers "current"
// with NO model call at all — so asking repeatedly is free until you actually
// commit something. Advisory only: it recommends reruns, it never gates.

const DEFAULT_TASK_KIND = "easy";
const THIS_CHECK_ID = "meta.report-currency";

function git(args, cwd) {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd, maxBuffer: 8 * 1024 * 1024 }, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout.toString());
    });
  });
}

function repoRoot() {
  // The workspace is the `verifier/` dir; the repo root is its parent.
  return workspacePath("..");
}

async function headCommit(cwd) {
  if (process.env.COMMONALITY_VERIFIER_REPORT_CURRENCY_HEAD) {
    return process.env.COMMONALITY_VERIFIER_REPORT_CURRENCY_HEAD.trim();
  }
  return (await git(["rev-parse", "HEAD"], cwd)).trim();
}

// Commits in base..HEAD as { sha, subject, stat }. A test/override env var can
// inject a canned list so the known-bad fixture is deterministic and git-free.
async function commitsSince(base, cwd) {
  const override = process.env.COMMONALITY_VERIFIER_REPORT_CURRENCY_COMMITS;
  if (override) return JSON.parse(override);
  if (!base) return []; // cold start: nothing to compare against yet.

  const range = `${base}..HEAD`;
  let log;
  try {
    log = await git(["log", "--no-merges", "--format=%H%x1f%s", range], cwd);
  } catch {
    // Watermark commit not in history (e.g. rebased/squashed away): treat as cold
    // start rather than failing — we just re-baseline at HEAD.
    return [];
  }
  const commits = [];
  for (const line of log.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const [sha, subject] = line.split("\x1f");
    let stat = "";
    try {
      stat = truncate((await git(["show", "--stat", "--format=", sha], cwd)).trim(), 1500);
    } catch {
      stat = "(stat unavailable)";
    }
    commits.push({ sha, subject, stat });
  }
  return commits;
}

// Newest stored result for a check id, by lexical filename order (timestamp-prefixed).
// A test override lets the known-bad fixture inject (or clear) the prior result so
// the fast-path case stays hermetic regardless of the real result store.
async function latestStoredResult(checkId) {
  if (checkId === THIS_CHECK_ID && process.env.COMMONALITY_VERIFIER_REPORT_CURRENCY_PREV !== undefined) {
    const raw = process.env.COMMONALITY_VERIFIER_REPORT_CURRENCY_PREV.trim();
    return raw === "" || raw === "null" ? null : JSON.parse(raw);
  }
  const dir = workspacePath("results", checkId);
  let files;
  try {
    files = (await readdir(dir)).filter((name) => name.endsWith(".json")).sort();
  } catch {
    return null;
  }
  if (files.length === 0) return null;
  try {
    return JSON.parse(await readFile(path.join(dir, files[files.length - 1]), "utf8"));
  } catch {
    return null;
  }
}

async function walkDefs(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walkDefs(full));
    else if (entry.name.endsWith(".def.json")) out.push(full);
  }
  return out;
}

// id -> description, so the model knows what each check actually covers.
async function checkDescriptions() {
  const map = new Map();
  for (const defFile of await walkDefs(workspacePath("checks"))) {
    try {
      const def = JSON.parse(await readFile(defFile, "utf8"));
      if (def.id) map.set(def.id, def.description ?? "");
    } catch {
      // ignore unparseable defs
    }
  }
  return map;
}

function minutesSince(timestamp) {
  if (!timestamp) return null;
  const time = Date.parse(timestamp);
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 60000));
}

function describeAge(ageMinutes) {
  if (ageMinutes === null) return "never run";
  if (ageMinutes < 60) return `${ageMinutes}m ago`;
  if (ageMinutes < 1440) return `${Math.floor(ageMinutes / 60)}h ago`;
  return `${Math.floor(ageMinutes / 1440)}d ago`;
}

function renderChecks(workers, descriptions) {
  return workers.map((worker) => {
    const ageMinutes = minutesSince(worker.result?.timestamp);
    const description = descriptions.get(worker.id) ?? "";
    return `- ${worker.id} (last ran ${describeAge(ageMinutes)}): ${description}`;
  }).join("\n");
}

function renderCommits(commits) {
  return commits.map((commit) => {
    const sha = String(commit.sha ?? "").slice(0, 10);
    return `### ${sha} ${commit.subject ?? ""}\n${commit.stat ?? ""}`.trim();
  }).join("\n\n");
}

function buildPrompt(commits, workers, descriptions) {
  return `You are deciding whether a project's verification report is still up to date, or whether specific checks should be re-run because of work done since the report was generated.

You are given (a) the list of verification checks and what each one covers, and (b) the git commits that have landed SINCE the report was generated. Decide which checks the commits plausibly invalidate — i.e. which checks, if re-run now, might give a different answer than the stored one because the work they verify has changed.

Judge by what the commits actually touch (their subjects and changed files), mapped to what each check covers. When unsure, prefer to flag a CHEAP check as invalidated and leave EXPENSIVE end-to-end/stack checks alone unless a commit clearly affects them — an unnecessary cheap rerun is fine, an unnecessary expensive one is wasteful. A purely additive or unrelated commit (e.g. editing this verifier's own docs) need not invalidate product checks.

Return ONLY a single JSON object with this exact shape:
{
  "status": "pass" | "uncertain",
  "summary": "one-line answer: is the report current, or which areas are stale",
  "invalidatedChecks": [
    {
      "checkId": "the check id from the list",
      "severity": "high" | "medium" | "low",
      "reason": "which commit(s) and why this check's evidence may now be wrong"
    }
  ],
  "reportMarkdown": "Markdown report with sections: Verdict, Commits considered, Checks to re-run (with why), Checks still current"
}

Status policy (advisory; it only colours the summary):
- "uncertain" if any check is invalidated (the report is not fully current).
- "pass" if the commits do not invalidate any check (the report is still current).
Leave invalidatedChecks empty when nothing is invalidated.

THE CHECKS:
${renderChecks(workers, descriptions)}

COMMITS SINCE THE REPORT (newest first):
${renderCommits(commits)}`;
}

function deriveStatus(invalidatedChecks) {
  return Array.isArray(invalidatedChecks) && invalidatedChecks.length > 0 ? "uncertain" : "pass";
}

emit(async () => {
  const inputs = readInputs();
  const params = mergedParams(inputs);
  const workers = inputs.filter((input) => input.kind === "check");
  const cwd = repoRoot();

  let head;
  try {
    head = await headCommit(cwd);
  } catch (error) {
    return errorResult(`Could not resolve HEAD commit: ${error?.message ?? String(error)}`);
  }

  const previous = await latestStoredResult(THIS_CHECK_ID);
  const watermark = previous?.findings?.watermarkCommit ?? null;
  const commits = await commitsSince(watermark, cwd);

  // Free fast path: nothing committed since we last looked. Re-answer from the
  // stored verdict without spending a model call.
  if (commits.length === 0) {
    const carried = Array.isArray(previous?.findings?.invalidatedChecks) ? previous.findings.invalidatedChecks : [];
    const findings = { watermarkCommit: head, commitsConsidered: 0, invalidatedChecks: carried, modelCalled: false };
    if (!watermark) {
      return pass(`Report-currency baseline established at ${head.slice(0, 10)}; no prior watermark to compare against.`, { findings });
    }
    const summary = carried.length > 0
      ? `No new commits since ${head.slice(0, 10)}; report still stale for ${carried.length} check(s) from the prior evaluation.`
      : `No new commits since ${head.slice(0, 10)}; report is current.`;
    return deriveStatus(carried) === "pass" ? pass(summary, { findings }) : uncertain(summary, { findings });
  }

  const descriptions = await checkDescriptions();
  const prompt = buildPrompt(commits, workers, descriptions);
  const promptArtifact = await writeTextArtifact("prompt.md", prompt, "text/markdown", "Prompt, check inventory, and commits-since-report supplied to the currency model.");
  const model = resolveModel(params, {
    modelEnvVar: "COMMONALITY_VERIFIER_REPORT_CURRENCY_MODEL",
    defaultTaskKind: DEFAULT_TASK_KIND
  });

  let rawResponse;
  try {
    rawResponse = await getLlmResponse(prompt, params, promptArtifact.path, model, {
      fixtureEnvVar: "COMMONALITY_VERIFIER_REPORT_CURRENCY_FIXTURE_RESPONSE",
      commandEnvVar: "COMMONALITY_VERIFIER_REPORT_CURRENCY_COMMAND"
    });
  } catch (error) {
    return errorResult(`Could not run report-currency judgment: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact] });
  }

  const rawArtifact = await writeTextArtifact("raw-response.txt", rawResponse, "text/plain", "Raw LLM response before JSON parsing.");

  let review;
  try {
    review = validateJudgmentResponse(parseJsonObject(rawResponse), { arrayFields: ["invalidatedChecks"] });
  } catch (error) {
    return errorResult(`Could not parse report-currency judgment: ${error?.message ?? String(error)}`, { artifacts: [promptArtifact, rawArtifact] });
  }

  const reportArtifact = await writeTextArtifact("report-currency.md", review.reportMarkdown, "text/markdown", "Which checks the commits since the report plausibly invalidated, and which are still current.");
  const invalidatedChecks = review.invalidatedChecks ?? [];
  const findings = {
    watermarkCommit: head,
    previousWatermark: watermark,
    commitsConsidered: commits.length,
    commits: commits.map((commit) => ({ sha: String(commit.sha ?? "").slice(0, 10), subject: commit.subject ?? "" })),
    invalidatedChecks,
    model: model ?? "command-default",
    modelCalled: true
  };
  const artifacts = [promptArtifact, rawArtifact, reportArtifact];

  // Derive the status from the structured invalidation list, not the model's
  // self-reported status, mirroring the other judgment leaves.
  const summary = invalidatedChecks.length > 0
    ? `${invalidatedChecks.length} check(s) likely stale after ${commits.length} commit(s) since ${head.slice(0, 10)}: ${invalidatedChecks.map((item) => item.checkId).join(", ")}.`
    : `Report still current after ${commits.length} commit(s) since ${head.slice(0, 10)}.`;
  return deriveStatus(invalidatedChecks) === "pass" ? pass(summary, { findings, artifacts }) : uncertain(summary, { findings, artifacts });
});
