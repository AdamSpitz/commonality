const DIGEST_PATTERN = /^0x[0-9a-f]{64}$/;

function bundleContainsCid(bundle, cid) {
  return bundle?.layers?.some((layer) => layer?.ref?.document?.entries?.some(
    (entry) => entry?.subject?.type === "cid" && entry.subject.value === cid,
  ));
}

export function assessPolicyEnforcement({ profile, uiConfig, bundle, gateway }) {
  const problems = [];
  const bundleUrl = uiConfig?.VITE_POLICY_BUNDLE_URL;
  const platformApiUrl = uiConfig?.VITE_PLATFORM_API_URL;
  const digest = bundle?.digest;
  const gatewayDigest = gateway.headers?.["x-commonality-policy-digest"];
  const gatewayStatus = gateway.headers?.["x-commonality-policy-status"];

  if (!bundleUrl) problems.push("Civility config has no VITE_POLICY_BUNDLE_URL.");
  if (!platformApiUrl) problems.push("Civility config has no VITE_PLATFORM_API_URL.");
  if (bundle?.schema !== "commonality.policy-bundle/v1") problems.push("The configured policy artifact is not a v1 resolved bundle.");
  if (!DIGEST_PATTERN.test(digest ?? "")) problems.push("The configured policy bundle has no canonical digest.");
  if (!bundleContainsCid(bundle, profile.blockedCid)) problems.push("The configured blocked fixture CID is not asserted by the resolved bundle.");
  if (gateway.status !== 451) problems.push(`The policy gateway returned HTTP ${gateway.status}, expected 451 for the blocked fixture.`);
  if (gatewayStatus !== "current") problems.push(`The policy gateway reported status '${gatewayStatus ?? "unreported"}', expected 'current'.`);
  if (gatewayDigest !== digest) problems.push(`Client bundle digest ${digest ?? "unreported"} disagrees with gateway digest ${gatewayDigest ?? "unreported"}.`);
  if (gateway.body?.error !== "content_refused_by_policy") problems.push("The blocked fixture response did not report content_refused_by_policy.");

  return { problems, bundleUrl, platformApiUrl, digest, gatewayDigest, gatewayStatus };
}
