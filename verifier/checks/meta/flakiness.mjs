import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { emit, pass, readInputs, uncertain, workspacePath } from "../lib/result.mjs";

// Trend/flakiness watchdog. The rest of the dashboard answers "is this check
// green right now?"; this one stands back and reads each check's *retained
// result history* and asks "should we actually trust that green?". Two kinds of
// distrust are surfaced as uncertain (yellow) under meta.verifier-health:
//
//   1. Binary instability — a leaf that flips pass -> fail -> pass is not
//      trustworthy even when it happens to be green at the moment you look.
//   2. Slow degradation — a leaf that stays green but whose runtime drifts
//      steadily upward, signalling a creeping performance/resource problem that
//      a single green snapshot hides.
//
// Deterministic: it only reads stored result JSON, never re-runs anything. Only
// pass <-> (fail|error) flips count as binary instability; uncertain is treated
// as a neutral "not currently known" state and never counts as a flip, so leaves
// that legitimately alternate pass/uncertain (the advisory LLM/report-currency
// leaves) are not mistaken for flaky. Duration drift is measured only on records
// that carry a numeric `durationMs`, and only for checks that are currently
// green (a failing check is already flagged by its flips).

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
    const duration = Number(record?.durationMs);
    records.push({
      time: Number.isNaN(time) ? 0 : time,
      status: record?.status,
      polarity: polarity(record?.status),
      durationMs: Number.isFinite(duration) && duration > 0 ? duration : null
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

// Slow-degradation probe. Compares the mean runtime of the first half of the
// executed-run samples to the mean of the second half. A check that has grown
// past `growthThreshold` (e.g. 1.5x = 50% slower) and whose recent runs are still
// above `minMs` (so trivially fast checks don't get flagged for noise) is
// drifting even while it stays green. Returns null when there isn't enough
// signal to make the claim.
//
// Only records that actually ran the check (`pass` or `fail`) contribute a
// duration sample. `error` results are guard refusals / harness failures whose
// ~spawn-overhead durationMs is not a real runtime, and mixing them in would
// manufacture fake drift (e.g. a guarded deep check that reads 30ms while
// skipped and 300s when actually run).
function durationTrend(sequence, { growthThreshold, minMs, minSamples }) {
  const samples = sequence
    .filter((r) => (r.status === "pass" || r.status === "fail") && r.durationMs !== null)
    .map((r) => r.durationMs);
  if (samples.length < minSamples) return null;
  const half = Math.floor(samples.length / 2);
  const head = samples.slice(0, half);
  const tail = samples.slice(half);
  if (head.length === 0 || tail.length === 0) return null;
  const headMean = head.reduce((a, b) => a + b, 0) / head.length;
  const tailMean = tail.reduce((a, b) => a + b, 0) / tail.length;
  if (headMean <= 0 || tailMean < minMs) return null;
  const ratio = tailMean / headMean;
  if (ratio < growthThreshold) return null;
  return { headMean, tailMean, ratio, samples };
}

emit(async () => {
  const params = mergedParams(readInputs());
  const window = Number(params.window ?? 12);
  const flipThreshold = Number(params.flipThreshold ?? 2);
  const durationGrowthThreshold = Number(params.durationGrowthThreshold ?? 1.5);
  const durationMinMs = Number(params.durationMinMs ?? 2000);
  const durationMinSamples = Number(params.durationMinSamples ?? 4);
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

    if (flips >= flipThreshold) {
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
      // A check already flagged for binary flakiness is not a clean signal for
      // drift analysis — its durations bounce for the same reason its status does.
      continue;
    }

    // Slow degradation only matters for a check that is green right now: a
    // failing check is already visible on the dashboard, and the dangerous case
    // here is precisely "green but quietly getting worse".
    const currentlyGood = polarities[polarities.length - 1] === "good";
    if (!currentlyGood) continue;

    const trend = durationTrend(sequence, {
      growthThreshold: durationGrowthThreshold,
      minMs: durationMinMs,
      minSamples: durationMinSamples
    });
    if (!trend) continue;

    const trace = sequence
      .filter((r) => (r.status === "pass" || r.status === "fail") && r.durationMs !== null)
      .map((r) => `${Math.round(r.durationMs)}ms`)
      .join(" → ");
    findings.push({
      severity: "medium",
      confidence: "medium",
      area: "verifier",
      title: `${checkId} is slowing down (runtime grew ~${trend.ratio.toFixed(1)}x over ${trend.samples.length} runs)`,
      evidence: [
        `duration trace: ${trace}`,
        `early mean ${Math.round(trend.headMean)}ms → recent mean ${Math.round(trend.tailMean)}ms`,
        `still passing, but the trend suggests a creeping resource/perf regression`
      ],
      recommendation: `Investigate ${checkId}'s upward runtime trend before trusting its green; a steadily slowing check often precedes a timeout failure.`
    });
  }

  if (findings.length > 0) {
    findings.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1));
    return uncertain(`${findings.length} verifier check(s) show instability or drift over their retained history.`, { findings });
  }

  return pass(`No instability or runtime drift across ${analyzed} verifier check(s) with decisive history.`, {
    findings: { analyzed, window, flipThreshold, durationGrowthThreshold, durationMinMs, durationMinSamples }
  });
});
