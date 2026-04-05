import assert from 'assert';
import { computeTransitiveTrustMapping } from './queries.js';

describe('computeTransitiveTrustMapping', () => {
  it('propagates trust transitively using multiplicative scores', async () => {
    const mapping = await computeTransitiveTrustMapping(async (trusterAddress) => {
      const normalized = trusterAddress.toLowerCase();
      if (normalized === '0x1000000000000000000000000000000000000000') {
        return new Map([
          ['0xa000000000000000000000000000000000000000', 80],
          ['0xb000000000000000000000000000000000000000', 30],
        ]);
      }
      if (normalized === '0xa000000000000000000000000000000000000000') {
        return new Map([['0xc000000000000000000000000000000000000000', 50]]);
      }
      if (normalized === '0xb000000000000000000000000000000000000000') {
        return new Map([['0xc000000000000000000000000000000000000000', 90]]);
      }
      return new Map();
    }, '0x1000000000000000000000000000000000000000');

    assert.strictEqual(mapping.get('0xa000000000000000000000000000000000000000'), 80);
    assert.strictEqual(mapping.get('0xb000000000000000000000000000000000000000'), 30);
    assert.strictEqual(mapping.get('0xc000000000000000000000000000000000000000'), 40);
  });

  it('respects the minimum score threshold and max hops', async () => {
    const mapping = await computeTransitiveTrustMapping(async (trusterAddress) => {
      const normalized = trusterAddress.toLowerCase();
      if (normalized === '0x1000000000000000000000000000000000000000') {
        return new Map([['0xa000000000000000000000000000000000000000', 10]]);
      }
      if (normalized === '0xa000000000000000000000000000000000000000') {
        return new Map([['0xb000000000000000000000000000000000000000', 5]]);
      }
      return new Map();
    }, '0x1000000000000000000000000000000000000000', {
      minScore: 1,
      maxHops: 2,
    });

    assert.strictEqual(mapping.get('0xa000000000000000000000000000000000000000'), 10);
    assert.strictEqual(mapping.has('0xb000000000000000000000000000000000000000'), false);
  });

  it('reuses and fills a provided direct trust cache', async () => {
    const directTrustCache = new Map([
      [
        '0xa000000000000000000000000000000000000000',
        new Map([['0xc000000000000000000000000000000000000000', 50]]),
      ],
      [
        '0xc000000000000000000000000000000000000000',
        new Map(),
      ],
    ]);
    const fetchedAddresses: string[] = [];

    const mapping = await computeTransitiveTrustMapping(async (trusterAddress) => {
      const normalized = trusterAddress.toLowerCase();
      fetchedAddresses.push(normalized);

      if (normalized === '0x1000000000000000000000000000000000000000') {
        return new Map([['0xa000000000000000000000000000000000000000', 80]]);
      }

      throw new Error(`Unexpected direct trust fetch for ${normalized}`);
    }, '0x1000000000000000000000000000000000000000', {
      directTrustCache,
    });

    assert.deepStrictEqual(fetchedAddresses, ['0x1000000000000000000000000000000000000000']);
    assert.strictEqual(mapping.get('0xa000000000000000000000000000000000000000'), 80);
    assert.strictEqual(mapping.get('0xc000000000000000000000000000000000000000'), 40);
    assert.strictEqual(
      directTrustCache.get('0x1000000000000000000000000000000000000000')?.get('0xa000000000000000000000000000000000000000'),
      80
    );
  });

  it('reports progress as the trusted set grows', async () => {
    const progressSnapshots: string[][] = [];

    const mapping = await computeTransitiveTrustMapping(async (trusterAddress) => {
      const normalized = trusterAddress.toLowerCase();
      if (normalized === '0x1000000000000000000000000000000000000000') {
        return new Map([
          ['0xa000000000000000000000000000000000000000', 80],
          ['0xb000000000000000000000000000000000000000', 30],
        ]);
      }
      if (normalized === '0xa000000000000000000000000000000000000000') {
        return new Map([
          ['0xc000000000000000000000000000000000000000', 50],
          ['0xb000000000000000000000000000000000000000', 20],
        ]);
      }
      if (normalized === '0xb000000000000000000000000000000000000000') {
        return new Map([['0xd000000000000000000000000000000000000000', 90]]);
      }
      return new Map();
    }, '0x1000000000000000000000000000000000000000', {
      onProgress: (snapshot) => {
        progressSnapshots.push(Array.from(snapshot.keys()).sort());
      },
    });

    assert.deepStrictEqual(progressSnapshots, [
      [
        '0xa000000000000000000000000000000000000000',
        '0xb000000000000000000000000000000000000000',
      ],
      [
        '0xa000000000000000000000000000000000000000',
        '0xb000000000000000000000000000000000000000',
        '0xc000000000000000000000000000000000000000',
      ],
      [
        '0xa000000000000000000000000000000000000000',
        '0xb000000000000000000000000000000000000000',
        '0xc000000000000000000000000000000000000000',
        '0xd000000000000000000000000000000000000000',
      ],
    ]);
    assert.strictEqual(mapping.get('0xd000000000000000000000000000000000000000'), 27);
  });
});
