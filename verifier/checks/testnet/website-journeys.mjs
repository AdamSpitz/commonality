import { emit, errorResult, pass, uncertain } from "../lib/result.mjs";
import { fetchText, readTestnetConfig, requireOptIn } from "./lib.mjs";

emit(async () => {
  try { requireOptIn(); } catch (error) { return errorResult(error.message, { findings: { requiredEnv: error.requiredEnv } }); }
  const config = await readTestnetConfig();
  if (process.env.COMMONALITY_VERIFIER_ENABLE_TESTNET_BROWSER_JOURNEYS !== "1") {
    return errorResult("Refusing to run deployed browser journeys without COMMONALITY_VERIFIER_ENABLE_TESTNET_BROWSER_JOURNEYS=1.", {
      findings: {
        requiredEnv: ["COMMONALITY_VERIFIER_ENABLE_TESTNET_BROWSER_JOURNEYS"],
        plannedScope: "Run Playwright-style user journeys against *.testnet.commonality.works, optionally with wallet/testnet mutations."
      }
    });
  }
  const probes = await Promise.all(config.appUrls.map((url) => fetchText(url, { maxBodyChars: 2000 })));
  const failed = probes.filter((probe) => !probe.ok);
  if (failed.length === 0) return pass(`Placeholder deployed journey smoke reached ${probes.length} app URL(s); full browser journeys still need implementation.`, { findings: { probes, partialCoverage: true } });
  return uncertain(`Placeholder deployed journey smoke could not reach ${failed.length}/${probes.length} app URL(s).`, { findings: { probes, partialCoverage: true } });
});
