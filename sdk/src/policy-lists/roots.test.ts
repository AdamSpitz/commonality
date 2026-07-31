import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { parsePolicyRootDocument, POLICY_ROOT_SCHEMA } from './roots.js';

const HASH = `0x${'ab'.repeat(32)}`;
const ADDRESS = '0x1234567890ABCDEF1234567890abcdef12345678';

function root(overrides: Record<string, unknown> = {}): unknown {
  return {
    schema: POLICY_ROOT_SCHEMA,
    layers: [{
      id: 'standard-illegal',
      ref: { source: 'https://lists.example/list.json' },
      op: 'block',
      except: { ref: { source: 'file:./appeals.json', contentHash: HASH } },
      maxResolutionAge: 'PT1H',
      maxDiff: '10',
      onError: 'closed',
    }],
    actions: { 'standard-illegal': ['suppress', 'refuse-serve'] },
    honoredRetractors: [ADDRESS, ADDRESS.toLowerCase()],
    ...overrides,
  };
}

describe('policy root documents', () => {
  it('strictly parses roots and canonicalizes shorthand actions and sets', () => {
    assert.deepEqual(parsePolicyRootDocument(root()), {
      schema: POLICY_ROOT_SCHEMA,
      layers: [{
        id: 'standard-illegal',
        ref: { source: 'https://lists.example/list.json' },
        op: 'block',
        except: { ref: { source: 'file:./appeals.json', contentHash: HASH } },
        maxResolutionAge: 'PT1H',
        maxAdded: '10',
        maxRemoved: '10',
        onError: 'closed',
      }],
      actions: {
        'standard-illegal': {
          cid: ['refuse-serve', 'suppress'],
          address: ['suppress'],
          channel: ['suppress'],
        },
      },
      honoredRetractors: [ADDRESS.toLowerCase()],
    });
  });

  it('accepts compatible long-form action maps', () => {
    const parsed = parsePolicyRootDocument(root({
      actions: { 'standard-illegal': { cid: ['refuse-serve'], channel: ['suppress'] } },
    }));
    assert.deepEqual(parsed.actions, {
      'standard-illegal': { cid: ['refuse-serve'], channel: ['suppress'] },
    });
  });

  it('rejects mismatched layers, impossible actions, and unpinned exceptions', () => {
    assert.throws(() => parsePolicyRootDocument(root({ actions: {} })), /correspond exactly/);
    assert.throws(
      () => parsePolicyRootDocument(root({ actions: { 'standard-illegal': [] } })),
      /must not be empty/,
    );
    assert.throws(
      () => parsePolicyRootDocument(root({ actions: { missing: ['suppress'] } })),
      /correspond exactly/,
    );
    assert.throws(
      () => parsePolicyRootDocument(root({ actions: { 'standard-illegal': { channel: ['refuse-serve'] } } })),
      /cannot extract channel/,
    );
    const unpinned = root() as { layers: Array<Record<string, unknown>> };
    unpinned.layers[0] = { id: 'standard-illegal', ref: { source: 'file:./list.json' }, op: 'block', onError: 'closed', except: { ref: { source: 'file:./appeals.json' } } };
    assert.throws(() => parsePolicyRootDocument(unpinned), /Missing policy root field: contentHash/);
  });

  it('rejects invalid ids, refs, durations, error behavior, and unknown fields', () => {
    for (const layer of [
      { id: 'Upper', ref: { source: 'file:./x' }, op: 'block', onError: 'closed' },
      { id: 'ok', ref: { source: 'http://example/x' }, op: 'block', onError: 'closed' },
      { id: 'ok', ref: { source: 'file:./x' }, op: 'allow', onError: 'closed' },
      { id: 'ok', ref: { source: 'file:./x' }, op: 'block', onError: 'hold' },
      { id: 'ok', ref: { source: 'file:./x' }, op: 'block', onError: 'closed', maxResolutionAge: 'P1M' },
    ]) {
      assert.throws(() => parsePolicyRootDocument(root({ layers: [layer], actions: { [layer.id]: ['suppress'] } })));
    }
    assert.throws(() => parsePolicyRootDocument({ ...(root() as object), extra: true }), /Unknown policy root field: extra/);
  });

  it('uses canonical uint64 strings for diff thresholds and forbids ambiguous shorthand', () => {
    for (const threshold of [0, '-1', '01', '18446744073709551616']) {
      const layer = { id: 'standard-illegal', ref: { source: 'file:./x' }, op: 'block', onError: 'closed', maxAdded: threshold };
      assert.throws(() => parsePolicyRootDocument(root({ layers: [layer] })), /canonical uint64/);
    }
    const layer = { id: 'standard-illegal', ref: { source: 'file:./x' }, op: 'block', onError: 'closed', maxDiff: '1', maxAdded: '1' };
    assert.throws(() => parsePolicyRootDocument(root({ layers: [layer] })), /cannot be combined/);
  });
});
