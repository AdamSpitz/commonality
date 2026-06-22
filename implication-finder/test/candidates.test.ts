import assert from 'assert';
import { selectCandidatePairs } from '../src/candidates.js';
import type { PopularStatement } from '../src/popularity.js';

describe('selectCandidatePairs', () => {
  const popular: PopularStatement[] = [
    { cid: 'cidPop1', believerCount: 10 },
    { cid: 'cidPop2', believerCount: 5 },
  ];

  const allSameDomain = new Map<string, string>([
    ['cidNew', 'politics'],
    ['cidPop1', 'politics'],
    ['cidPop2', 'politics'],
  ]);

  it('generates pairs in both directions for each new statement', () => {
    const newCids = new Set(['cidNew']);
    const pairs = selectCandidatePairs(newCids, popular, new Set(), allSameDomain);

    assert.strictEqual(pairs.length, 4); // 2 popular × 2 directions
    assert.ok(pairs.some(p => p.fromCid === 'cidNew' && p.toCid === 'cidPop1'));
    assert.ok(pairs.some(p => p.fromCid === 'cidPop1' && p.toCid === 'cidNew'));
    assert.ok(pairs.some(p => p.fromCid === 'cidNew' && p.toCid === 'cidPop2'));
    assert.ok(pairs.some(p => p.fromCid === 'cidPop2' && p.toCid === 'cidNew'));
  });

  it('skips already-evaluated pairs', () => {
    const newCids = new Set(['cidNew']);
    const evaluated = new Set(['cidNew:cidPop1', 'cidPop2:cidNew']);
    const pairs = selectCandidatePairs(newCids, popular, evaluated, allSameDomain);

    assert.strictEqual(pairs.length, 2);
    assert.ok(pairs.some(p => p.fromCid === 'cidPop1' && p.toCid === 'cidNew'));
    assert.ok(pairs.some(p => p.fromCid === 'cidNew' && p.toCid === 'cidPop2'));
  });

  it('skips self-pairs when new statement is also popular', () => {
    const newCids = new Set(['cidPop1']);
    const pairs = selectCandidatePairs(newCids, popular, new Set(), allSameDomain);

    // Should only pair cidPop1 with cidPop2 (both directions), not with itself
    assert.strictEqual(pairs.length, 2);
    assert.ok(pairs.every(p => p.fromCid !== p.toCid));
  });

  it('returns empty array when no new statements', () => {
    const pairs = selectCandidatePairs(new Set(), popular, new Set(), allSameDomain);
    assert.strictEqual(pairs.length, 0);
  });

  it('returns empty array when no popular statements', () => {
    const pairs = selectCandidatePairs(new Set(['cidNew']), [], new Set(), allSameDomain);
    assert.strictEqual(pairs.length, 0);
  });

  it('handles multiple new statements', () => {
    const newCids = new Set(['cidNew1', 'cidNew2']);
    const domainMap = new Map<string, string>([
      ['cidNew1', 'politics'],
      ['cidNew2', 'politics'],
      ['cidPop1', 'politics'],
      ['cidPop2', 'politics'],
    ]);
    const pairs = selectCandidatePairs(newCids, popular, new Set(), domainMap);

    // 2 new × 2 popular × 2 directions = 8
    assert.strictEqual(pairs.length, 8);
  });

  it('skips cross-domain pairs when both domains are known', () => {
    const newCids = new Set(['cidNew']);
    const domainMap = new Map<string, string>([
      ['cidNew', 'crypto'],
      ['cidPop1', 'politics'],
      ['cidPop2', 'crypto'],
    ]);
    const pairs = selectCandidatePairs(newCids, popular, new Set(), domainMap);

    // cidNew(crypto) should only pair with cidPop2(crypto), not cidPop1(politics)
    assert.strictEqual(pairs.length, 2);
    assert.ok(pairs.some(p => p.fromCid === 'cidNew' && p.toCid === 'cidPop2'));
    assert.ok(pairs.some(p => p.fromCid === 'cidPop2' && p.toCid === 'cidNew'));
  });

  it('allows pairs when one statement domain is unknown', () => {
    const newCids = new Set(['cidNew']);
    const domainMap = new Map<string, string>([
      ['cidPop1', 'politics'],
      // cidNew has no entry in the map (unknown domain)
    ]);
    const pairs = selectCandidatePairs(newCids, popular, new Set(), domainMap);

    // Both popular statements should pair with cidNew since cidNew's domain is unknown
    assert.strictEqual(pairs.length, 4);
  });

  it('allows pairs when both statement domains are unknown', () => {
    const newCids = new Set(['cidNew']);
    const pairs = selectCandidatePairs(newCids, popular, new Set(), new Map());

    // No domains known, so no filtering occurs
    assert.strictEqual(pairs.length, 4);
  });

  it('caps adversarially large candidate floods while preserving deterministic order', () => {
    const manyNewCids = new Set(Array.from({ length: 50 }, (_, i) => `cidNew${i}`));
    const manyPopular = Array.from({ length: 50 }, (_, i) => ({
      cid: `cidPop${i}`,
      believerCount: 100 - i,
    }));
    const pairs = selectCandidatePairs(manyNewCids, manyPopular, new Set(), new Map(), 7);

    assert.strictEqual(pairs.length, 7);
    assert.deepStrictEqual(pairs, [
      { fromCid: 'cidNew0', toCid: 'cidPop0' },
      { fromCid: 'cidPop0', toCid: 'cidNew0' },
      { fromCid: 'cidNew0', toCid: 'cidPop1' },
      { fromCid: 'cidPop1', toCid: 'cidNew0' },
      { fromCid: 'cidNew0', toCid: 'cidPop2' },
      { fromCid: 'cidPop2', toCid: 'cidNew0' },
      { fromCid: 'cidNew0', toCid: 'cidPop3' },
    ]);
  });

  it('returns no pairs when the per-cycle cap is zero', () => {
    const pairs = selectCandidatePairs(new Set(['cidNew']), popular, new Set(), allSameDomain, 0);
    assert.deepStrictEqual(pairs, []);
  });
});
