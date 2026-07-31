import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import {
  POLICY_BUNDLE_SCHEMA,
  PolicyBundleValidationError,
  parseResolvedPolicyBundle,
} from './bundles.js';

const digest = `0x${'1'.repeat(64)}`;
const contentHash = `0x${'2'.repeat(64)}`;
const cid = 'bafkreifzjut3te2nhyekklss27nh3k7232xplrvgnbo3wxj335rkr3v36m';

function validBundle(): Record<string, unknown> {
  return {
    schema: POLICY_BUNDLE_SCHEMA,
    layers: [{
      id: 'editorial',
      ref: {
        source: 'file:./editorial.json',
        contentHash,
        document: {
          schema: 'commonality.policy-list-local/v1',
          entries: [{ subject: { type: 'cid', value: cid } }],
        },
      },
      except: { unresolved: true },
      onError: 'closed',
      freshness: { maxResolutionAge: 'PT1H' },
      maxAdded: '10',
      maxRemoved: '5',
    }],
    actions: { editorial: { cid: ['suppress', 'refuse-serve'] } },
    honoredRetractors: ['0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
    sequence: '17',
    digest,
  };
}

function firstLayer(bundle: Record<string, unknown>): Record<string, unknown> {
  return (bundle.layers as Record<string, unknown>[])[0]!;
}

function resolvedRef(bundle: Record<string, unknown>): Record<string, unknown> {
  return firstLayer(bundle).ref as Record<string, unknown>;
}

describe('resolved policy bundle schema', () => {
  it('parses and normalizes a complete inline bundle', () => {
    const parsed = parseResolvedPolicyBundle(validBundle());
    assert.equal(parsed.digest, digest);
    assert.equal(parsed.layers[0]?.except?.unresolved, true);
    assert.deepEqual(parsed.honoredRetractors, ['0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa']);
  });

  it('represents a cold-start unresolved block layer explicitly', () => {
    const input = validBundle();
    (input.layers as unknown[])[0] = { id: 'editorial', unresolved: true, onError: 'closed' };
    const parsed = parseResolvedPolicyBundle(input);
    assert.equal(parsed.layers[0]?.unresolved, true);
    assert.equal(parsed.layers[0]?.ref, undefined);
  });

  it('rejects ambiguous resolved/unresolved layers', () => {
    const input = validBundle();
    firstLayer(input).unresolved = true;
    assert.throws(() => parseResolvedPolicyBundle(input), PolicyBundleValidationError);
  });

  it('strictly validates embedded documents', () => {
    const input = validBundle();
    (resolvedRef(input).document as Record<string, unknown>).extra = true;
    assert.throws(() => parseResolvedPolicyBundle(input), /artifact document is invalid/);
  });

  it('requires exact layer/action correspondence', () => {
    const input = validBundle();
    input.actions = { typo: { cid: ['suppress'] } };
    assert.throws(() => parseResolvedPolicyBundle(input), /correspond exactly/);
  });

  for (const sequence of ['01', '-1', '1.0', 1]) {
    it(`rejects non-canonical sequence ${String(sequence)}`, () => {
      const input = validBundle();
      input.sequence = sequence;
      assert.throws(() => parseResolvedPolicyBundle(input), /sequence/);
    });
  }

  it('rejects unknown fields and malformed hashes', () => {
    const unknown = validBundle();
    unknown.extra = true;
    assert.throws(() => parseResolvedPolicyBundle(unknown), /Unknown/);

    const malformed = validBundle();
    malformed.digest = `0x${'A'.repeat(64)}`;
    assert.throws(() => parseResolvedPolicyBundle(malformed), /digest/);
  });
});
