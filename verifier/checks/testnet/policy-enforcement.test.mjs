import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assessPolicyEnforcement } from "./policy-enforcement-lib.mjs";

const blockedCid = "bafkreifzjut3te2nhyekklss27nh3k7232xplrvgnbo3wxj335rkr3v36m";
const digest = `0x${"a".repeat(64)}`;
const input = {
  profile: { blockedCid },
  uiConfig: { VITE_POLICY_BUNDLE_URL: "https://operator.example/bundle.json", VITE_PLATFORM_API_URL: "https://api.example" },
  bundle: {
    schema: "commonality.policy-bundle/v1",
    digest,
    layers: [{ ref: { document: { entries: [{ subject: { type: "cid", value: blockedCid } }] } } }],
  },
  gateway: {
    status: 451,
    headers: { "x-commonality-policy-status": "current", "x-commonality-policy-digest": digest },
    body: { error: "content_refused_by_policy" },
  },
};

describe("deployed policy enforcement assessment", () => {
  it("accepts digest agreement and a refused fixture", () => {
    assert.deepEqual(assessPolicyEnforcement(input).problems, []);
  });

  it("rejects a missing fixture and divergent gateway digest", () => {
    const result = assessPolicyEnforcement({
      ...input,
      bundle: { ...input.bundle, layers: [] },
      gateway: { ...input.gateway, headers: { ...input.gateway.headers, "x-commonality-policy-digest": `0x${"b".repeat(64)}` } },
    });
    assert.equal(result.problems.length, 2);
  });
});
