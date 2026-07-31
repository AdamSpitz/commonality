import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { parseResolvedPolicyBundle, resolvedPolicyBundleDigest, type ResolvedPolicyBundle } from './bundles.js';
import { createPolicyEvaluator, createPolicyLookup } from './evaluator.js';
import { canonicalJsonSha256, type JsonValue } from './json.js';
import { parsePolicySubject } from './subjects.js';

const cid = 'bafkreifzjut3te2nhyekklss27nh3k7232xplrvgnbo3wxj335rkr3v36m';
const otherCid = 'bafkreibm6jgkh3i7msq4b6r7t4nqv4lqvvl6i3hmh6f3x3p4vxw7jz4fue';

function artifact(entries: unknown[]) {
  const document = { schema: 'commonality.policy-list-local/v1', entries };
  return {
    source: 'file:./list.json',
    contentHash: canonicalJsonSha256(document as JsonValue),
    document,
  };
}

function bundle(): ResolvedPolicyBundle {
  const withoutDigest = {
    schema: 'commonality.policy-bundle/v1',
    layers: [
      {
        id: 'shared',
        ref: artifact([
          { subject: { type: 'cid', value: cid }, reason: 'shared-ticket' },
          { subject: { type: 'address', chainId: '8453', value: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' } },
        ]),
        except: { ref: artifact([{ subject: { type: 'cid', value: cid } }]) },
        onError: 'closed',
      },
      {
        id: 'editorial',
        ref: artifact([{ subject: { type: 'cid', value: cid } }]),
        except: { unresolved: true },
        onError: 'open',
      },
      { id: 'unresolved', unresolved: true, onError: 'closed' },
    ],
    actions: {
      shared: { cid: ['suppress'], address: ['suppress'] },
      editorial: { cid: ['suppress'] },
      unresolved: { cid: ['suppress'] },
    },
    honoredRetractors: [],
    sequence: '1',
  } as Omit<ResolvedPolicyBundle, 'digest'>;
  return parseResolvedPolicyBundle({
    ...withoutDigest,
    digest: resolvedPolicyBundleDigest(withoutDigest),
  });
}

const digest = bundle().digest;

describe('policy-list membership lookup', () => {
  it('subtracts an exception only from its attached layer and preserves provenance order', () => {
    const lookup = createPolicyLookup(bundle());
    assert.deepEqual(lookup(parsePolicySubject({ type: 'cid', value: cid })), {
      assertedBy: ['editorial'],
      digest,
    });
  });

  it('matches exact canonical subjects and does not propagate between subject types', () => {
    const lookup = createPolicyLookup(bundle());
    assert.deepEqual(
      lookup(parsePolicySubject({
        type: 'address',
        chainId: '8453',
        value: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      })).assertedBy,
      ['shared'],
    );
    assert.deepEqual(
      lookup(parsePolicySubject({
        type: 'address',
        chainId: '1',
        value: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      })).assertedBy,
      [],
    );
    assert.deepEqual(
      lookup(parsePolicySubject({ type: 'cid', value: otherCid })).assertedBy,
      [],
    );
  });

  it('does not invent membership for unresolved block layers or exceptions', () => {
    const lookup = createPolicyLookup(bundle());
    assert.deepEqual(lookup(parsePolicySubject({ type: 'cid', value: cid })).assertedBy, ['editorial']);
  });
});

describe('policy-list action evaluation', () => {
  const contentRequest = {
    item: {
      cid,
      publisher: { chainId: '8453', value: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
      projectContract: { chainId: '8453', value: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
    },
  };

  it('blocks when an extracted subject is asserted by a layer mapped to that action', () => {
    const evaluator = createPolicyEvaluator(bundle(), 'current');
    const result = evaluator.evaluate('suppress', contentRequest);

    assert.equal(result.decision, 'block');
    assert.deepEqual(result.assertedBy, ['shared', 'editorial', 'unresolved']);
    assert.equal(result.subjects.length, 3);
    assert.equal(result.digest, digest);
    assert.equal(result.status, 'current');
  });

  it('filters membership through the action and subject-type mapping', () => {
    const evaluator = createPolicyEvaluator(bundle(), 'stale');
    const result = evaluator.evaluate('refuse-serve', { cid });

    assert.equal(result.decision, 'allow');
    assert.deepEqual(result.assertedBy, []);
    assert.equal(result.status, 'stale');
  });

  it('fails closed for a governed unresolved closed layer without inventing lookup membership', () => {
    const evaluator = createPolicyEvaluator(bundle(), 'unavailable');
    const result = evaluator.evaluate('suppress', {
      item: {
        cid: otherCid,
        publisher: { chainId: '8453', value: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
        projectContract: { chainId: '8453', value: '0xcccccccccccccccccccccccccccccccccccccccc' },
      },
    });

    assert.equal(result.decision, 'block');
    assert.deepEqual(result.assertedBy, ['unresolved']);
    assert.deepEqual(evaluator.lookup(result.subjects[0]!).assertedBy, []);
  });
});
