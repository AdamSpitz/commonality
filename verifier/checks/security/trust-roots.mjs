import { emit, fail, pass } from "../lib/result.mjs";

const GUARDED_KEYS = [
  "VITE_DEFAULT_TRUSTED_ATTESTERS",
  "VITE_DEFAULT_TRUSTED_CONTENT_ATTESTERS",
  "VITE_DEFAULT_TRUSTED_BEAT_AGENTS",
  "VITE_DEFAULT_NUDGERS",
  "VITE_CSM_MEDIATOR_NUDGER"
];

function input(as) {
  return JSON.parse(process.env.VERIFIER_INPUTS ?? "[]").find((item) => item.as === as);
}

function parseEnv(text) {
  const values = {};
  for (const line of (text ?? "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (match) values[match[1]] = match[2].replace(/^"|"$/g, "");
  }
  return values;
}

emit(async () => {
  const baselineInput = input("baseline");
  const baseline = JSON.parse(baselineInput?.content ?? "{}");
  const envInputs = JSON.parse(process.env.VERIFIER_INPUTS ?? "[]").filter((item) => item.as?.startsWith("env:"));
  const drift = [];

  for (const envInput of envInputs) {
    const path = envInput.as.slice("env:".length);
    const expected = baseline.files?.[path] ?? {};
    const actualEnv = parseEnv(envInput.content);
    for (const key of GUARDED_KEYS) {
      if (expected[key] !== undefined && actualEnv[key] !== expected[key]) {
        drift.push({ path, key, expected: expected[key], actual: actualEnv[key] ?? null });
      }
    }
  }

  const findings = { guardedKeys: GUARDED_KEYS, drift };
  if (drift.length > 0) return fail(`${drift.length} trusted attester/nudger baseline value(s) drifted.`, { findings });
  return pass(`Trusted attester/nudger config matches baseline in ${envInputs.length} deployment env file(s).`, { findings });
});
