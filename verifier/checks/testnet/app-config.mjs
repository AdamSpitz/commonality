import { emit, errorResult, fail, pass } from "../lib/result.mjs";
import { fetchText, readEnvFile, readTestnetConfig, requireOptIn } from "./lib.mjs";

function scriptSources(html, baseUrl) {
  return [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((match) => new URL(match[1], baseUrl).toString());
}

function configUrl(appUrl) {
  return new URL("./config.json", appUrl.endsWith("/") ? appUrl : `${appUrl}/`).toString();
}

function parseJsonProbe(probe) {
  if (!probe.ok) return { ok: false, error: `HTTP ${probe.status}` };
  try {
    return { ok: true, value: JSON.parse(probe.rawBody ?? probe.body) };
  } catch (error) {
    return { ok: false, error: `Invalid JSON: ${error.message}` };
  }
}

function stringifyConfigValues(configs) {
  return configs.map(({ json }) => JSON.stringify(json?.value ?? {})).join("\n");
}

emit(async () => {
  try { requireOptIn(); } catch (error) { return errorResult(error.message, { findings: { requiredEnv: error.requiredEnv } }); }
  const config = await readTestnetConfig();
  const shell = await fetchText(config.appUrl, { maxBodyChars: 200000 });
  if (!shell.ok) return fail(`Could not fetch testnet app shell (${shell.status}).`, { findings: { shell } });

  const appConfigProbes = await Promise.all(config.appUrls.map(async (url) => {
    const probe = await fetchText(configUrl(url), { maxBodyChars: 100000 });
    return { appUrl: url, configUrl: configUrl(url), probe, json: parseJsonProbe(probe) };
  }));
  const badConfigEndpoints = appConfigProbes.filter((entry) => !entry.json.ok).map((entry) => ({ appUrl: entry.appUrl, configUrl: entry.configUrl, status: entry.probe.status, error: entry.json.error, body: entry.probe.body }));

  const scripts = scriptSources(shell.body, shell.finalUrl ?? config.appUrl).slice(0, 12);
  const scriptProbes = await Promise.all(scripts.map((url) => fetchText(url, { maxBodyChars: 500000 })));
  const searchable = [shell.body, stringifyConfigValues(appConfigProbes), ...scriptProbes.filter((p) => p.ok).map((p) => p.body)].join("\n");
  // Contract addresses that must appear in the deployed config are derived from the
  // deployment env file (not hardcoded here), so a contract redeploy can't leave this
  // check asserting stale addresses. Missing/malformed keys are reported explicitly.
  const requiredContractKeys = config.expectedConfig?.requiredContractKeys ?? [];
  const contractEnv = requiredContractKeys.length > 0 ? await readEnvFile(config.contractsEnvFile) : {};
  const unresolvedContractKeys = requiredContractKeys.filter((key) => !contractEnv[key]);
  const requiredContractAddresses = requiredContractKeys.map((key) => contractEnv[key]).filter(Boolean);

  const forbiddenHits = (config.expectedConfig?.forbiddenText ?? []).filter((needle) => searchable.includes(needle));
  const missingRequired = [...(config.expectedConfig?.requiredText ?? []), ...requiredContractAddresses].filter((needle) => !searchable.includes(needle));
  const wrongChainConfig = appConfigProbes
    .filter((entry) => entry.json.ok && String(entry.json.value.VITE_CHAIN_ID ?? entry.json.value.VITE_DEFAULT_CHAIN_ID ?? "") !== String(config.chainId))
    .map((entry) => ({ appUrl: entry.appUrl, configuredChainId: entry.json.value.VITE_CHAIN_ID ?? entry.json.value.VITE_DEFAULT_CHAIN_ID ?? null, expectedChainId: config.chainId }));
  const failedScripts = scriptProbes.filter((p) => !p.ok).map((p) => ({ url: p.url, status: p.status, body: p.body }));
  const findings = { appUrl: config.appUrl, configEndpoints: appConfigProbes.map((entry) => ({ appUrl: entry.appUrl, configUrl: entry.configUrl, ok: entry.json.ok, status: entry.probe.status, error: entry.json.error, keys: entry.json.ok ? Object.keys(entry.json.value).sort() : [] })), badConfigEndpoints, wrongChainConfig, scripts, failedScripts, forbiddenHits, missingRequired, unresolvedContractKeys };
  if (badConfigEndpoints.length > 0 || wrongChainConfig.length > 0 || failedScripts.length > 0 || forbiddenHits.length > 0 || missingRequired.length > 0 || unresolvedContractKeys.length > 0) {
    return fail(`Testnet app config failed: ${badConfigEndpoints.length} config endpoint failure(s), ${wrongChainConfig.length} wrong chain config(s), ${failedScripts.length} script fetch failure(s), ${forbiddenHits.length} forbidden value(s), ${missingRequired.length} missing required value(s), ${unresolvedContractKeys.length} unresolved contract key(s).`, { findings });
  }
  return pass("Testnet app config endpoints and bundle contain expected deployed chain/endpoint/address config and no obvious local-dev values.", { findings });
});
