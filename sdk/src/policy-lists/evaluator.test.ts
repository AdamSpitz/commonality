import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { parseResolvedPolicyBundle, type ResolvedPolicyBundle } from './bundles.js';
import { createPolicyLookup } from './evaluator.js';
import { parsePolicySubject } from './subjects.js';

const digest = `0x${'1'.repeat(64)}` as const;
const contentHash = `0x${'2'.repeat(64)}`;
const cid = 'bafkreifzjut3te2nhyekklss27nh3k7232xplrvgnbo3wxj335rkr3v36m';
const otherCid = 'bafkreibm6jgkh3i7msq4b6r7t4nqv4lqvvl6i3hmh6f3x3p4vxw7jz4fue';

function artifact(entries: unknown[]) {
  return {
    source: 'file:./list.json',
    contentHash,
    document: { schema: 'commonality.policy-list-local/v1', entries },
  };
}

function bundle(): ResolvedPolicyBundle {
  return parseResolvedPolicyBundle({
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
    digest,
  });
}

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
