import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { emit, pass, readInputs, uncertain, workspacePath } from "../lib/result.mjs";

// Deployment-depth watchdog. The deepest functionality signals — the checks that
// actually boot the whole stack and hit real endpoints (stack.fresh-seeded,
// stack.restart-consistency, stack.user-journeys, artifact.ipfs-domain-smoke,
// env.testnet-smoke) — are guarded and opt-in, so in ordinary operation they sit
// "skipped by policy" forever. On the dashboard that is indistinguishable from
// "we have never once proven the whole system boots." This leaf reads each deep
// check's *retained result history*, finds the most recent run that actually
// PASSED (a skipped/error opt-in refusal does not count), and reports a single
// honest number: "last end-to-end boot: N days ago". It ages facet.functionality
// toward yellow when that proof is stale or absent, so the facet cannot rest on
// fast unit tests while claiming end-to-end confidence.
//
// Deterministic: it only reads stored result JSON, never re-runs anything. It
// never returns fail (a never-booted stack is an honest "unknown", not a defect),
// so it can age the facet to uncertain without turning it red on its own.

function mergedParams(inputs) {
  return Object.assign({}, ...inputs.filter((i) => i.kind === "params").map((i) => i.data ?? {}));
}

const DEFAULT_BOOT_CHECK_IDS = [
  "stack.fresh-seeded",
  "stack.restart-consistency",
  "stack.user-journeys",
  "artifact.ipfs-domain-smoke",
  "env.testnet-smoke"
];

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

// The most recent run of `checkId` whose status is "pass" — i.e. the last time
// this deep check actually ran to completion rather than refusing its opt-in.
async function lastRealPass(resultsDir, checkId) {
  const dir = path.join(resultsDir, checkId);
  let entries;
  try {
    entries = (await readdir(dir)).filter((name) => name.endsWith(".json"));
  } catch {
    return null;
  }
  let best = null;
  for (const name of entries) {
    let record;
    try {
      record = await readJson(path.join(dir, name));
    } catch {
      continue;
    }
    if (record?.status !== "pass") continue;
    const time = Date.parse(record?.timestamp ?? "");
    if (Number.isNaN(time)) continue;
    if (best === null || time > best.time) best = { time, timestamp: record.timestamp, summary: record.summary };
  }
  return best;
}

function ageDays(time) {
  return Math.floor((Date.now() - time) / 86400000);
}

emit(async () => {
  const params = mergedParams(readInputs());
  const bootCheckIds = params.bootCheckIds ?? DEFAULT_BOOT_CHECK_IDS;
  const maxAgeDays = Number(params.maxAgeDays ?? 7);
  const resultsDir = process.env.VERIFIER_RESULTS ?? workspacePath("results");

  const checks = await Promise.all(
    bootCheckIds.map(async (checkId) => {
      const real = await lastRealPass(resultsDir, checkId);
      return {
        checkId,
        lastRealPass: real?.timestamp ?? null,
        ageDays: real ? ageDays(real.time) : null,
        time: real?.time ?? null
      };
    })
  );

  const everBooted = checks.filter((c) => c.time !== null);
  const freshest = everBooted.reduce((acc, c) => (acc === null || c.time > acc.time ? c : acc), null);
  const lastBootDays = freshest ? ageDays(freshest.time) : null;

  const findings = {
    maxAgeDays,
    lastEndToEndBootDays: lastBootDays,
    lastEndToEndBootCheck: freshest?.checkId ?? null,
    lastEndToEndBootAt: freshest?.lastRealPass ?? null,
    checks
  };

  if (freshest === null) {
    return uncertain(
      `Last end-to-end boot: never — none of the ${checks.length} deep stack checks (${bootCheckIds.join(", ")}) has a passing run on record; the full stack has not once been proven to boot.`,
      { findings }
    );
  }

  if (lastBootDays > maxAgeDays) {
    return uncertain(
      `Last end-to-end boot: ${lastBootDays} days ago (${freshest.checkId}), older than the ${maxAgeDays}-day cadence; the deep stack proof is stale. Re-run the guarded deep stack checks.`,
      { findings }
    );
  }

  return pass(
    `Last end-to-end boot: ${lastBootDays} day(s) ago (${freshest.checkId}); ${everBooted.length}/${checks.length} deep stack checks have a passing run on record.`,
    { findings }
  );
});
