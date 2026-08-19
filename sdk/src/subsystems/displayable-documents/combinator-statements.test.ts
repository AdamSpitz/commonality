import assert from 'assert';
import {
  combinatorAttestationPairs,
  combinatorImplication,
  createCombinatorStatement,
  parseCombinatorStatement,
  publishedDataCidForDocument,
  COMBINATOR_GLOSS,
} from './index.js';

describe('combinator statements', () => {
  const a = 'bafkreiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const b = 'bafkreibbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  const c = 'bafkreicccccccccccccccccccccccccccccccccccccccccccccccccccc';

  it('canonicalizes operand order so the same combo shares a CID', () => {
    const first = createCombinatorStatement('any', [c, a, b]);
    const second = createCombinatorStatement('any', [b, a, c]);
    assert.deepEqual(
      first.references?.map((ref) => ref.cid),
      [a, b, c],
    );
    assert.strictEqual(
      publishedDataCidForDocument(first),
      publishedDataCidForDocument(second),
    );
    assert.strictEqual(first.content, COMBINATOR_GLOSS.any);
    assert.strictEqual(first.extras?.createdDate, undefined);
  });

  it('all and any of the same operands are different CIDs', () => {
    const allDoc = createCombinatorStatement('all', [a, b]);
    const anyDoc = createCombinatorStatement('any', [a, b]);
    assert.notStrictEqual(
      publishedDataCidForDocument(allDoc),
      publishedDataCidForDocument(anyDoc),
    );
  });

  it('rejects a date or title stuffed into extras as non-canonical', () => {
    const doc = createCombinatorStatement('all', [a, b]);
    const withDate = {
      ...doc,
      extras: { ...doc.extras, createdDate: '2026-01-01T00:00:00.000Z' },
    };
    assert.strictEqual(parseCombinatorStatement(withDate), null);
  });

  it('mints only pairwise conjunction-elimination and disjunction-introduction', () => {
    const allDoc = createCombinatorStatement('all', [a, b]);
    const anyDoc = createCombinatorStatement('any', [a, b]);
    const allCid = publishedDataCidForDocument(allDoc);
    const anyCid = publishedDataCidForDocument(anyDoc);
    const plank = { format: 'markdown-restricted' as const, content: 'plank' };

    assert.strictEqual(
      combinatorImplication(allCid, allDoc, a, plank)?.rule,
      'conjunction-elimination',
    );
    assert.strictEqual(combinatorImplication(a, plank, allCid, allDoc), null);
    assert.strictEqual(
      combinatorImplication(a, plank, anyCid, anyDoc)?.rule,
      'disjunction-introduction',
    );
    assert.strictEqual(combinatorImplication(anyCid, anyDoc, a, plank), null);
  });

  it('lists the attester pairs for each operator', () => {
    const parsed = parseCombinatorStatement(createCombinatorStatement('all', [a, b]));
    assert.ok(parsed);
    assert.deepEqual(combinatorAttestationPairs('combo', parsed), [
      { fromCid: 'combo', toCid: a },
      { fromCid: 'combo', toCid: b },
    ]);
  });
});
