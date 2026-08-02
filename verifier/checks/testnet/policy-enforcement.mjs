import { emit, errorResult, fail, pass } from "../lib/result.mjs";
import { fetchText, readTestnetConfig, requireOptIn } from "./lib.mjs";
import { assessPolicyEnforcement } from "./policy-enforcement-lib.mjs";

function configUrl(appUrl) {
  return new URL("./config.json", appUrl.endsWith("/") ? appUrl : `${appUrl}/`).toString();
}

function parseJson(probe, label) {
  if (!probe.ok) return { error: `${label} returned HTTP ${probe.status}` };
  try {
    return { value: JSON.parse(probe.rawBody ?? probe.body) };
  } catch (error) {
    return { error: `${label} returned invalid JSON: ${error.message}` };
  }
}

emit(async () => {
  try { requireOptIn(); } catch (error) { return errorResult(error.message, { findings: { requiredEnv: error.requiredEnv } }); }
  const config = await readTestnetConfig();
  const profile = config.policyEnforcement;
  if (!profile?.civilityAppUrl || !profile?.blockedCid) {
    return fail("Testnet policy-enforcement fixture is not configured.", { findings: { profile } });
  }

  const uiConfigProbe = await fetchText(configUrl(profile.civilityAppUrl), { maxBodyChars: 100000 });
  const parsedUiConfig = parseJson(uiConfigProbe, "Civility config");
  if (parsedUiConfig.error) return fail(parsedUiConfig.error, { findings: { uiConfigProbe } });

  const bundleUrl = parsedUiConfig.value.VITE_POLICY_BUNDLE_URL;
  const platformApiUrl = parsedUiConfig.value.VITE_PLATFORM_API_URL;
  if (!bundleUrl || !platformApiUrl) {
    const assessment = assessPolicyEnforcement({ profile, uiConfig: parsedUiConfig.value, bundle: {}, gateway: { headers: {} } });
    return fail("Civility's deployed policy configuration is incomplete.", { findings: assessment });
  }

  const bundleProbe = await fetchText(bundleUrl, { maxBodyChars: 1000000 });
  const parsedBundle = parseJson(bundleProbe, "Policy bundle");
  if (parsedBundle.error) return fail(parsedBundle.error, { findings: { bundleUrl, bundleProbe } });

  const gatewayUrl = `${platformApiUrl.replace(/\/$/, "")}/policy-content/${encodeURIComponent(profile.blockedCid)}`;
  const gatewayProbe = await fetchText(gatewayUrl, { maxBodyChars: 4000 });
  const parsedGateway = parseJson({ ...gatewayProbe, ok: gatewayProbe.status === 451 }, "Policy gateway");
  const assessment = assessPolicyEnforcement({
    profile,
    uiConfig: parsedUiConfig.value,
    bundle: parsedBundle.value,
    gateway: { status: gatewayProbe.status, headers: gatewayProbe.headers, body: parsedGateway.value },
  });
  const findings = { ...assessment, civilityConfigUrl: configUrl(profile.civilityAppUrl), gatewayUrl, gatewayBody: parsedGateway.value ?? gatewayProbe.body };
  if (assessment.problems.length > 0) {
    return fail(`Deployed Civility policy enforcement has ${assessment.problems.length} agreement/refusal problem(s).`, { findings });
  }
  return pass(`Civility and its content gateway enforce digest ${assessment.digest}; the live blocked fixture is refused.`, { findings });
});
