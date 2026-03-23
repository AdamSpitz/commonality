import assert from 'assert';
import { selectCandidatePairs } from '../src/candidates.js';
import type { PopularStatement } from '../src/popularity.js';

describe('selectCandidatePairs', () => {
  const popular: PopularStatement[] = [
    { cid: 'cidPop1', believerCount: 10 },
    { cid: 'cidPop2', believerCount: 5 },
  ];

  it('generates pairs in both directions for each new statement', () => {
    const newCids = new Set(['cidNew']);
    const pairs = selectCandidatePairs(newCids, popular, new Set());

    assert.strictEqual(pairs.length, 4); // 2 popular × 2 directions
    assert.ok(pairs.some(p => p.fromCid === 'cidNew' && p.toCid === 'cidPop1'));
    assert.ok(pairs.some(p => p.fromCid === 'cidPop1' && p.toCid === 'cidNew'));
    assert.ok(pairs.some(p => p.fromCid === 'cidNew' && p.toCid === 'cidPop2'));
    assert.ok(pairs.some(p => p.fromCid === 'cidPop2' && p.toCid === 'cidNew'));
  });

  it('skips already-evaluated pairs', () => {
    const newCids = new Set(['cidNew']);
    const evaluated = new Set(['cidNew:cidPop1', 'cidPop2:cidNew']);
    const pairs = selectCandidatePairs(newCids, popular, evaluated);

    assert.strictEqual(pairs.length, 2);
    assert.ok(pairs.some(p => p.fromCid === 'cidPop1' && p.toCid === 'cidNew'));
    assert.ok(pairs.some(p => p.fromCid === 'cidNew' && p.toCid === 'cidPop2'));
  });

  it('skips self-pairs when new statement is also popular', () => {
    const newCids = new Set(['cidPop1']);
    const pairs = selectCandidatePairs(newCids, popular, new Set());

    // Should only pair cidPop1 with cidPop2 (both directions), not with itself
    assert.strictEqual(pairs.length, 2);
    assert.ok(pairs.every(p => p.fromCid !== p.toCid));
  });

  it('returns empty array when no new statements', () => {
    const pairs = selectCandidatePairs(new Set(), popular, new Set());
    assert.strictEqual(pairs.length, 0);
  });

  it('returns empty array when no popular statements', () => {
    const pairs = selectCandidatePairs(new Set(['cidNew']), [], new Set());
    assert.strictEqual(pairs.length, 0);
  });

  it('handles multiple new statements', () => {
    const newCids = new Set(['cidNew1', 'cidNew2']);
    const pairs = selectCandidatePairs(newCids, popular, new Set());

    // 2 new × 2 popular × 2 directions = 8
    assert.strictEqual(pairs.length, 8);
  });
});
