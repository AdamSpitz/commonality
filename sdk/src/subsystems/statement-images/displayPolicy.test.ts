import assert from "node:assert/strict";
import { describe, it } from "mocha";
import { POLICY_BUNDLE_SCHEMA, resolvedPolicyBundleDigest, type ResolvedPolicyBundle } from "../../policy-lists/bundles.js";
import { canonicalJsonSha256, type JsonValue } from "../../policy-lists/json.js";
import { PolicyBundleRuntime } from "../../policy-lists/runtime.js";
import { statementImageCidHiddenByPolicy } from "./displayPolicy.js";

const blockedCid = "bafkreifzjut3te2nhyekklss27nh3k7232xplrvgnbo3wxj335rkr3v36m" as const;
const allowedCid = "bafkreib6z3wp7uj3d7ct6e3efwvl7yuxtzvqhvzq2g3m5v45x7zqsc2xmi" as const;

function bundle(): ResolvedPolicyBundle {
  const document = {
    schema: "commonality.policy-list-local/v1" as const,
    entries: [{ subject: { type: "cid" as const, value: blockedCid } }],
  };
  const withoutDigest = {
    schema: POLICY_BUNDLE_SCHEMA,
    layers: [{
      id: "starter",
      onError: "closed" as const,
      ref: {
        source: "https://lists.example/starter.json",
        contentHash: canonicalJsonSha256(document as JsonValue),
        document,
      },
    }],
    actions: { starter: { cid: ["refuse-serve" as const] } },
    honoredRetractors: [],
    sequence: "1",
  };
  return { ...withoutDigest, digest: resolvedPolicyBundleDigest(withoutDigest) };
}

describe("statementImageCidHiddenByPolicy", () => {
  it("hides only a CID the active bundle names", () => {
    const snapshot = new PolicyBundleRuntime().activate(bundle());
    assert.equal(statementImageCidHiddenByPolicy(snapshot, blockedCid), true);
    assert.equal(statementImageCidHiddenByPolicy(snapshot, allowedCid), false);
  });

  it("does not blank images when the bundle is missing", () => {
    assert.equal(statementImageCidHiddenByPolicy(undefined, blockedCid), false);
    assert.equal(
      statementImageCidHiddenByPolicy(new PolicyBundleRuntime().snapshot(), blockedCid),
      false,
    );
  });

  it("keeps hiding a named CID from a stale last-known-good bundle", async () => {
    const runtime = new PolicyBundleRuntime();
    runtime.activate(bundle());
    const stale = await runtime.refresh("/bundle.json", async () => {
      throw new Error("offline");
    });
    assert.equal(stale.status, "stale");
    assert.equal(statementImageCidHiddenByPolicy(stale, blockedCid), true);
  });
});
