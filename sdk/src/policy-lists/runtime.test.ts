import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { POLICY_BUNDLE_SCHEMA, resolvedPolicyBundleDigest, type ResolvedPolicyBundle } from './bundles.js';
import { canonicalJsonSha256, type JsonValue } from './json.js';
import { PolicyBundleRuntime, type PolicyBundleFetchResponse } from './runtime.js';

const cid = 'bafkreifzjut3te2nhyekklss27nh3k7232xplrvgnbo3wxj335rkr3v36m';

function bundle(sequence: string): ResolvedPolicyBundle {
  const document = { schema: 'commonality.policy-list-local/v1' as const, entries: [] };
  const withoutDigest = {
    schema: POLICY_BUNDLE_SCHEMA,
    layers: [{ id: 'starter', onError: 'closed' as const, ref: {
      source: 'https://lists.example/starter.json',
      contentHash: canonicalJsonSha256(document as JsonValue), document,
    } }],
    actions: { starter: { cid: ['suppress' as const] } },
    honoredRetractors: [], sequence,
  };
  return { ...withoutDigest, digest: resolvedPolicyBundleDigest(withoutDigest) };
}

const response = (value: unknown): PolicyBundleFetchResponse => ({ ok: true, status: 200, json: async () => value });

describe('PolicyBundleRuntime', () => {
  it('atomically activates a validated bundle', async () => {
    const runtime = new PolicyBundleRuntime();
    const active = await runtime.refresh('/bundle.json', async () => response(bundle('1')));
    assert.equal(active.status, 'current');
    assert.equal(active.bundle?.sequence, '1');
    assert.equal(active.evaluator?.evaluate('refuse-serve', { cid }).digest, active.bundle?.digest);
  });

  it('retains the last good bundle as stale after a refresh failure', async () => {
    const runtime = new PolicyBundleRuntime();
    await runtime.refresh('/bundle.json', async () => response(bundle('1')));
    const stale = await runtime.refresh('/bundle.json', async () => { throw new Error('offline'); });
    assert.equal(stale.status, 'stale');
    assert.equal(stale.bundle?.sequence, '1');
    assert.equal(stale.evaluator?.evaluate('refuse-serve', { cid }).status, 'stale');
  });

  it('reports unavailable when cold-start loading fails', async () => {
    const runtime = new PolicyBundleRuntime();
    const unavailable = await runtime.refresh('/bundle.json', async () => ({ ok: false, status: 503, json: async () => null }));
    assert.equal(unavailable.status, 'unavailable');
    assert.equal(unavailable.evaluator, undefined);
  });

  it('does not let an older concurrent refresh replace a newer bundle', async () => {
    const runtime = new PolicyBundleRuntime();
    let finishOlder!: (value: PolicyBundleFetchResponse) => void;
    const olderResponse = new Promise<PolicyBundleFetchResponse>((resolve) => { finishOlder = resolve; });
    const older = runtime.refresh('/older.json', async () => olderResponse);
    await runtime.refresh('/newer.json', async () => response(bundle('2')));
    finishOlder(response(bundle('1')));
    await older;
    assert.equal(runtime.snapshot().bundle?.sequence, '2');
  });
});
