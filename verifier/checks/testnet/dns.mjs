import { emit, errorResult, fail, pass } from "../lib/result.mjs";
import { checkTls, isPrivateAddress, readTestnetConfig, requireOptIn, resolveHost } from "./lib.mjs";

emit(async () => {
  try { requireOptIn(); } catch (error) { return errorResult(error.message, { findings: { requiredEnv: error.requiredEnv } }); }
  const config = await readTestnetConfig();
  const dnsResults = await Promise.all(config.expectedHosts.map(resolveHost));
  const tlsResults = await Promise.all(config.expectedHosts.map((host) => checkTls(host)));
  const failures = [];
  for (const result of dnsResults) {
    const addresses = [...result.a, ...result.aaaa];
    if (addresses.length === 0 && result.cname.length === 0) failures.push({ host: result.hostname, problem: "no A/AAAA/CNAME records", result });
    const privateAddresses = addresses.filter(isPrivateAddress);
    if (privateAddresses.length > 0) failures.push({ host: result.hostname, problem: "resolved to private address", privateAddresses });
  }
  for (const result of tlsResults) {
    if (!result.ok) failures.push({ host: result.hostname, problem: "TLS certificate/handshake failed", result });
  }
  const findings = { dnsResults, tlsResults, failures };
  if (failures.length > 0) return fail(`Testnet DNS/TLS failed for ${failures.length} host check(s).`, { findings });
  return pass(`Testnet DNS and TLS passed for ${config.expectedHosts.length} host(s).`, { findings });
});
