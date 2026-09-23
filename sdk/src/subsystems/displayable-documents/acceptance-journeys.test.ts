import { strict as assert } from 'node:assert';
import { describe, it } from 'mocha';
import {
  buildClusterDocument,
  nudgeTargets,
  parseClusterDocument,
  type BridgeClusterFields,
} from './bridge-cluster.js';
import { parentToModifiedFromTriple, type TripleDraft } from './bridge-triple.js';
import { createStatement } from './displayable-document.js';

/**
 * Document half of the acceptance journeys. Imports stay on displayable
 * documents. A payment module is not required to publish or re-read a bridge.
 */

const mediator = '0x1111111111111111111111111111111111111111' as const;
const parentOwner = '0x2222222222222222222222222222222222222222' as const;
const modifiedOwner = '0x3333333333333333333333333333333333333333' as const;

const parentCid = 'bafyparent';
const modifiedCid = 'bafymodified';

function cluster(): BridgeClusterFields {
  return {
    mediatorName: 'A human mediator',
    mediatorNote: 'Rewrote one side toward the other.',
    mediatorAddress: mediator,
    parents: [{ owner: parentOwner, slug: 'one-side' }],
    modified: [{
      owner: modifiedOwner,
      slug: 'one-side-rewritten',
      parentOwner,
      parentSlug: 'one-side',
    }],
    bridge: { owner: mediator, slug: 'shared-ground' },
    pairs: [
      { fromCid: modifiedCid, toCid: parentCid, role: 'modified-to-parent' },
      { fromCid: modifiedCid, toCid: 'bafybridge', role: 'modified-to-bridge' },
    ],
  };
}

describe('conceptspace acceptance documents', () => {
  it('round-trips a bridge cluster and keeps the old kind string', () => {
    const doc = buildClusterDocument(cluster());
    assert.equal(doc.extras?.kind, 'causestarter.bridge-cluster');
    const parsed = parseClusterDocument(doc);
    assert.equal(parsed?.mediatorAddress, mediator);
    assert.equal(parsed?.pairs[0]?.role, 'modified-to-parent');
  });

  it('follows parent→modified, not parent→bridge', () => {
    const targets = nudgeTargets(cluster());
    assert.deepEqual(targets, [{
      from: { owner: parentOwner, slug: 'one-side' },
      to: { owner: modifiedOwner, slug: 'one-side-rewritten' },
    }]);

    const triple: TripleDraft = {
      mediatorName: 'A human mediator',
      mediatorNote: '',
      sideA: {
        label: 'One side',
        parentCid,
        parentText: '',
        modifiedText: '',
        modifiedCid,
      },
      sideB: {
        label: 'The other side',
        parentCid: '',
        parentText: 'not published yet',
        modifiedText: 'also not published',
        modifiedCid: '',
      },
      commonGroundText: '',
      commonGroundCid: 'bafybridge',
    };
    assert.deepEqual(parentToModifiedFromTriple(triple), [{
      targetStatementCid: parentCid,
      suggestedStatementCid: modifiedCid,
    }]);
  });

  it('still reads an already-published statement document', () => {
    const doc = createStatement({ content: 'Parents should choose.' });
    assert.equal(doc.content, 'Parents should choose.');
    assert.equal(doc.format, 'markdown-restricted');
    assert.equal(doc.extras?.statementType, 'statement');
  });
});
