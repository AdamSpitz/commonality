import { emit, errorResult, fail, pass } from "../lib/result.mjs";
import { fetchText, readTestnetConfig, requireOptIn } from "./lib.mjs";

function scriptSources(html, baseUrl) {
  return [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((match) => new URL(match[1], baseUrl).toString());
}

emit(async () => {
  try { requireOptIn(); } catch (error) { return errorResult(error.message, { findings: { requiredEnv: error.requiredEnv } }); }
  const config = await readTestnetConfig();
  const shell = await fetchText(config.appUrl, { maxBodyChars: 200000 });
  if (!shell.ok) return fail(`Could not fetch testnet app shell (${shell.status}).`, { findings: { shell } });
  const scripts = scriptSources(shell.body, shell.finalUrl ?? config.appUrl).slice(0, 12);
  const scriptProbes = await Promise.all(scripts.map((url) => fetchText(url, { maxBodyChars: 500000 })));
  const searchable = [shell.body, ...scriptProbes.filter((p) => p.ok).map((p) => p.body)].join("\n");
  const forbiddenHits = (config.expectedConfig?.forbiddenText ?? []).filter((needle) => searchable.includes(needle));
  const missingRequired = (config.expectedConfig?.requiredText ?? []).filter((needle) => !searchable.includes(needle));
  const failedScripts = scriptProbes.filter((p) => !p.ok).map((p) => ({ url: p.url, status: p.status, body: p.body }));
  const findings = { appUrl: config.appUrl, scripts, failedScripts, forbiddenHits, missingRequired };
  if (failedScripts.length > 0 || forbiddenHits.length > 0 || missingRequired.length > 0) {
    return fail(`Testnet app config failed: ${failedScripts.length} script fetch failures, ${forbiddenHits.length} forbidden value(s), ${missingRequired.length} missing required value(s).`, { findings });
  }
  return pass("Testnet app bundle contains expected deployed endpoint/address config and no obvious local-dev values.", { findings });
});
