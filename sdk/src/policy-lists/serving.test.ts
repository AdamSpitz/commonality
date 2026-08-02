import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { POLICY_BUNDLE_SCHEMA, resolvedPolicyBundleDigest, type ResolvedPolicyBundle } from './bundles.js';
import { canonicalJsonSha256, type JsonValue } from './json.js';
import { PolicyBundleRuntime } from './runtime.js';
import {
  POLICY_DIGEST_HEADER,
  POLICY_STATUS_HEADER,
  evaluatePolicyServe,
  policySurfaceHeaders,
} from './serving.js';

const blockedCid = 'bafkreifzjut3te2nhyekklss27nh3k7232xplrvgnbo3wxj335rkr3v36m';
const allowedCid = 'bafkreib6z3wp7uj3d7ct6e3efwvl7yuxtzvqhvzq2g3m5v45x7zqsc2xmi';

function bundle(): ResolvedPolicyBundle {
  const document = {
    schema: 'commonality.policy-list-local/v1' as const,
    entries: [{ subject: { type: 'cid' as const, value: blockedCid } }],
  };
  const withoutDigest = {
    schema: POLICY_BUNDLE_SCHEMA,
    layers: [{
      id: 'starter',
      onError: 'closed' as const,
      ref: {
        source: 'https://lists.example/starter.json',
        contentHash: canonicalJsonSha256(document as JsonValue),
        document,
      },
    }],
    actions: { starter: { cid: ['refuse-serve' as const] } },
    honoredRetractors: [],
    sequence: '1',
  };
  return { ...withoutDigest, digest: resolvedPolicyBundleDigest(withoutDigest) };
}

describe('policy serving adapter', () => {
  it('refuses a listed CID and reports the exact enforced digest', () => {
    const runtime = new PolicyBundleRuntime();
    const snapshot = runtime.activate(bundle());
    const result = evaluatePolicyServe(snapshot, blockedCid);

    assert.equal(result.decision, 'refuse');
    assert.equal(result.reason, 'policy');
    assert.equal(result.report.digest, snapshot.bundle?.digest);
    assert.deepEqual(policySurfaceHeaders(result.report), {
      [POLICY_STATUS_HEADER]: 'current',
      [POLICY_DIGEST_HEADER]: snapshot.bundle?.digest,
    });
  });

  it('serves an unrelated CID under the same reported bundle', () => {
    const snapshot = new PolicyBundleRuntime().activate(bundle());
    const result = evaluatePolicyServe(snapshot, allowedCid);
    assert.equal(result.decision, 'serve');
    assert.equal(result.evaluation.decision, 'allow');
    assert.equal(result.report.digest, snapshot.bundle?.digest);
  });

  it('keeps enforcing a stale last-known-good bundle', async () => {
    const runtime = new PolicyBundleRuntime();
    runtime.activate(bundle());
    const stale = await runtime.refresh('/bundle.json', async () => { throw new Error('offline'); });
    const result = evaluatePolicyServe(stale, blockedCid);
    assert.equal(result.decision, 'refuse');
    assert.equal(result.reason, 'policy');
    assert.equal(result.report.status, 'stale');
    assert.equal(result.evaluation.status, 'stale');
  });

  it('fails closed without an activated bundle and still reports status', () => {
    const result = evaluatePolicyServe(new PolicyBundleRuntime().snapshot(), allowedCid);
    assert.deepEqual(result, {
      decision: 'refuse',
      reason: 'unavailable',
      report: { status: 'unavailable' },
    });
    assert.deepEqual(policySurfaceHeaders(result.report), {
      [POLICY_STATUS_HEADER]: 'unavailable',
    });
  });
});
