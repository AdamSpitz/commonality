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

function padAddressAsTopic(address) {
  return `0x${"0".repeat(24)}${address.toLowerCase().replace(/^0x/, "")}`;
}

/**
 * Trusted-source addresses are chain-scoped: an address that attests busily on
 * one network has published nothing on another, and the UI can only render that
 * as an ordinary zero. A baseline-drift check (`security.trust-roots`) cannot
 * catch it, because a value that is wrong for the chain but unchanged still
 * matches its baseline. So assert liveness against the chain itself.
 *
 * This is not hypothetical: a 2026-07-25 product review reported Tally's
 * headline promise as "reads as zero on first contact" and filed it as the
 * widest product gap in the pass. The cause was a trust root left pointing at
 * another network. See docs/dev/chain-scoped-trust-config.md.
 */
async function checkTrustRootLiveness(config, deployedText) {
  const keys = config.expectedConfig?.trustRootKeys ?? [];
  if (keys.length === 0) return { checked: [], notInBundle: [], unresolvedKeys: [], noPublications: [], queryFailures: [] };

  const env = await readEnvFile(config.contractsEnvFile);
  const unresolvedKeys = keys.filter((key) => !env[key]);
  const addresses = keys.flatMap((key) => (env[key] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => /^0x[a-fA-F0-9]{40}$/.test(value))
    .map((address) => ({ key, address })));

  // A trust root the deployed bundle never received is just as dead as one that
  // has published nothing, and fails for a different reason worth naming.
  const notInBundle = addresses.filter(({ address }) => !deployedText.toLowerCase().includes(address.toLowerCase()));

  const noPublications = [];
  const queryFailures = [];
  for (const { key, address } of addresses) {
    const url = `${config.eventCacheUrl.replace(/\/$/, "")}/api/events?chainId=${config.chainId}`
      + `&eventName=ImplicationAttestation&topic1=${padAddressAsTopic(address)}&limit=1`;
    const probe = await fetchText(url, { maxBodyChars: 4000 });
    const parsed = parseJsonProbe(probe);
    if (!parsed.ok) {
      queryFailures.push({ key, address, url, status: probe.status, error: parsed.error });
      continue;
    }
    const items = parsed.value?.items ?? parsed.value;
    if (!Array.isArray(items)) {
      queryFailures.push({ key, address, url, error: "Event-cache response had no items array" });
      continue;
    }
    if (items.length === 0) noPublications.push({ key, address, chainId: config.chainId });
  }

  return { checked: addresses, notInBundle, unresolvedKeys, noPublications, queryFailures };
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
  const trustRoots = await checkTrustRootLiveness(config, searchable);
  const deadTrustRoots = [...trustRoots.notInBundle, ...trustRoots.noPublications];
  const findings = { appUrl: config.appUrl, configEndpoints: appConfigProbes.map((entry) => ({ appUrl: entry.appUrl, configUrl: entry.configUrl, ok: entry.json.ok, status: entry.probe.status, error: entry.json.error, keys: entry.json.ok ? Object.keys(entry.json.value).sort() : [] })), badConfigEndpoints, wrongChainConfig, scripts, failedScripts, forbiddenHits, missingRequired, unresolvedContractKeys, trustRoots };
  if (badConfigEndpoints.length > 0 || wrongChainConfig.length > 0 || failedScripts.length > 0 || forbiddenHits.length > 0 || missingRequired.length > 0 || unresolvedContractKeys.length > 0 || deadTrustRoots.length > 0 || trustRoots.unresolvedKeys.length > 0) {
    return fail(`Testnet app config failed: ${badConfigEndpoints.length} config endpoint failure(s), ${wrongChainConfig.length} wrong chain config(s), ${failedScripts.length} script fetch failure(s), ${forbiddenHits.length} forbidden value(s), ${missingRequired.length} missing required value(s), ${unresolvedContractKeys.length} unresolved contract key(s), ${trustRoots.notInBundle.length} trust root(s) missing from the bundle, ${trustRoots.noPublications.length} trust root(s) with no publications on chain ${config.chainId}, ${trustRoots.unresolvedKeys.length} unresolved trust-root key(s).`, { findings });
  }
  // A trust-root query that could not run is reported but does not fail the
  // check: an unreachable event cache is the indexer checks' business, and
  // failing here would misattribute it to app config.
  if (trustRoots.queryFailures.length > 0) {
    return pass(`Testnet app config is as expected, but ${trustRoots.queryFailures.length} trust-root liveness quer(ies) could not be run.`, { findings });
  }
  return pass(`Testnet app config endpoints and bundle contain expected deployed chain/endpoint/address config, ${trustRoots.checked.length} live trust root(s), and no obvious local-dev values.`, { findings });
});
