import { emit, errorResult, fail, pass } from "../lib/result.mjs";
import { fetchText, readTestnetConfig, requireOptIn } from "./lib.mjs";

function validate(probe) {
  if (!probe.ok) return `HTTP ${probe.status}`;
  const body = probe.body.trim();
  if (!body) return "blank body";
  if (!/<html|<!doctype/i.test(body)) return "did not look like HTML app shell";
  if (/Application error|Internal Server Error|stack trace|Cannot find module/i.test(body)) return "error-looking app shell";
  return null;
}

emit(async () => {
  try { requireOptIn(); } catch (error) { return errorResult(error.message, { findings: { requiredEnv: error.requiredEnv } }); }
  const config = await readTestnetConfig();
  const probes = await Promise.all(config.appUrls.map((url) => fetchText(url, { maxBodyChars: 2000 })));
  const failures = probes.map((probe) => ({ url: probe.url, problem: validate(probe), status: probe.status, finalUrl: probe.finalUrl })).filter((item) => item.problem);
  const findings = { probes };
  if (failures.length > 0) return fail(`Testnet app shell failed for ${failures.length}/${probes.length} URL(s).`, { findings: { ...findings, failures } });
  return pass(`Testnet app shells loaded for ${probes.length} URL(s).`, { findings });
});
