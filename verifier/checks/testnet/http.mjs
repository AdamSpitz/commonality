import { emit, errorResult, fail, pass } from "../lib/result.mjs";
import { fetchText, readTestnetConfig, requireOptIn } from "./lib.mjs";

function badBody(body) {
  return /cloudflare.*error|render.*not found|Application error|Internal Server Error|Cannot GET|stack trace/i.test(body ?? "");
}

emit(async () => {
  try { requireOptIn(); } catch (error) { return errorResult(error.message, { findings: { requiredEnv: error.requiredEnv } }); }
  const config = await readTestnetConfig();
  const urls = [...config.appUrls, ...config.serviceUrls];
  const probes = await Promise.all(urls.map((url) => fetchText(url, { maxBodyChars: 1500 })));
  const failures = probes.filter((probe) => !probe.ok || badBody(probe.body)).map((probe) => ({ url: probe.url, status: probe.status, finalUrl: probe.finalUrl, body: probe.body }));
  const httpRedirects = await Promise.all(config.expectedHosts.map((host) => fetchText(`http://${host}`, { redirect: "manual", maxBodyChars: 500 })));
  const redirectFailures = httpRedirects.filter((probe) => ![301, 302, 307, 308].includes(probe.status) && probe.status !== 200);
  const findings = { probes, httpRedirects, failures, redirectFailures };
  if (failures.length > 0 || redirectFailures.length > 0) return fail(`Testnet HTTP failed: ${failures.length} bad endpoint(s), ${redirectFailures.length} bad HTTP redirect(s).`, { findings });
  return pass(`Testnet HTTP endpoints responded for ${urls.length} URL(s).`, { findings });
});
