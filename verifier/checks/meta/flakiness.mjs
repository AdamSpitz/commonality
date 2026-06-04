import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { emit, pass, readInputs, uncertain, workspacePath } from "../lib/result.mjs";

// Trend/flakiness watchdog. The rest of the dashboard answers "is this check
// green right now?"; this one stands back and reads each check's *retained
// result history* and asks "should we actually trust that green?". A leaf that
// flips pass -> fail -> pass is not trustworthy even when it happens to be green
// at the moment you look, so we surface instability as uncertain (yellow) under
// meta.verifier-health rather than letting a flaky green hide.
//
// Deterministic: it only reads stored result JSON, never re-runs anything. Only
// pass <-> (fail|error) flips count as instability; uncertain is treated as a
// neutral "not currently known" state and never counts as a flip, so leaves that
// legitimately alternate pass/uncertain (the advisory LLM/report-currency leaves)
// are not mistaken for flaky.

function mergedParams(inputs) {
  return Object.assign({}, ...inputs.filter((i) => i.kind === "params").map((i) => i.data ?? {}));
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

// pass -> "good", fail/error -> "bad", everything else (uncertain) -> null so it
// is dropped from the flip analysis.
function polarity(status) {
  if (status === "pass") return "good";
  if (status === "fail" || status === "error") return "bad";
  return null;
}

// Load the recent good/bad polarity sequence for one check, oldest -> newest,
// capped at `window` most-recent results to bound work and stay in the regime
// retention keeps anyway.
async function loadSequence(resultsDir, checkId, window) {
  const dir = path.join(resultsDir, checkId);
  let entries;
  try {
    entries = (await readdir(dir)).filter((name) => name.endsWith(".json"));
  } catch {
    return [];
  }
  const records = [];
  for (const name of entries) {
    let record;
    try {
      record = await readJson(path.join(dir, name));
    } catch {
      continue;
    }
    const time = Date.parse(record?.timestamp ?? "");
    records.push({
      time: Number.isNaN(time) ? 0 : time,
      status: record?.status,
      polarity: polarity(record?.status)
    });
  }
  records.sort((a, b) => a.time - b.time);
  return records.slice(-window);
}

// Count transitions in the good/bad subsequence (uncertain dropped). >= 2 means
// the check went one way and came back at least once.
function countFlips(sequence) {
  const polarities = sequence.map((r) => r.polarity).filter(Boolean);
  let flips = 0;
  for (let i = 1; i < polarities.length; i += 1) {
    if (polarities[i] !== polarities[i - 1]) flips += 1;
  }
  return { flips, polarities };
}

emit(async () => {
  const params = mergedParams(readInputs());
  const window = Number(params.window ?? 12);
  const flipThreshold = Number(params.flipThreshold ?? 2);
  const ignore = new Set([...(params.ignoreCheckIds ?? []), "meta.flakiness"]);

  const resultsDir = process.env.VERIFIER_RESULTS ?? workspacePath("results");

  let checkDirs;
  try {
    checkDirs = (await readdir(resultsDir, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return uncertain("No verifier results directory found.", { findings: { resultsDir } });
  }

  const findings = [];
  let analyzed = 0;

  for (const checkId of checkDirs.sort()) {
    if (ignore.has(checkId)) continue;
    const sequence = await loadSequence(resultsDir, checkId, window);
    const { flips, polarities } = countFlips(sequence);
    if (polarities.length === 0) continue;
    analyzed += 1;
    if (flips < flipThreshold) continue;

    const goods = polarities.filter((p) => p === "good").length;
    const bads = polarities.length - goods;
    const currentlyGood = polarities[polarities.length - 1] === "good";
    // A flaky leaf that is green *right now* is the dangerous case: the dashboard
    // would invite trust the history does not justify.
    const severity = currentlyGood ? "high" : "medium";
    const trace = sequence.map((r) => r.status ?? "?").join(" → ");

    findings.push({
      severity,
      confidence: "high",
      area: "verifier",
      title: `${checkId} is flaky (${flips} pass/fail flips across ${polarities.length} decisive runs)`,
      evidence: [`status trace: ${trace}`, `pass ${goods} / fail-or-error ${bads}`],
      recommendation: currentlyGood
        ? `Do not trust ${checkId}'s current green; find the nondeterminism (flaky test, ordering, external dependency) before relying on it.`
        : `${checkId} alternates pass/fail; stabilize it so a single result is meaningful.`
    });
  }

  if (findings.length > 0) {
    findings.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1));
    return uncertain(`${findings.length} verifier check(s) show pass/fail instability over their retained history.`, { findings });
  }

  return pass(`No pass/fail instability across ${analyzed} verifier check(s) with decisive history.`, {
    findings: { analyzed, window, flipThreshold }
  });
});
