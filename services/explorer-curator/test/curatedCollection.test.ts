import { strict as assert } from 'assert';
import { describe, it } from 'mocha';

describe('createCuratedCollection (nudger-core)', () => {
  it('creates a valid curated collection publication', async () => {
    const { createCuratedCollection } = await import('@commonality/nudger-core');

    const entries = [
      { cid: 'bafkreia1' as `0x${string}`, label: 'Housing', topicArea: 'Urban Development' },
      { cid: 'bafkreia2' as `0x${string}`, label: 'Education', topicArea: 'Social Services', parentCid: 'bafkreia1' as `0x${string}` },
    ];

    const collection = createCuratedCollection(
      '0x' + 'cc'.repeat(20),
      'fundable-project-explorer',
      entries,
      1700000000
    );

    assert.strictEqual(collection.kind, 'curated-collection');
    assert.strictEqual(collection.schemaVersion, 1);
    assert.strictEqual(collection.nudger, '0x' + 'cc'.repeat(20));
    assert.strictEqual(collection.publishedAt, 1700000000);
    assert.strictEqual(collection.stream, 'fundable-project-explorer');
    assert.strictEqual(collection.entries.length, 2);
    assert.strictEqual(collection.entries[0].label, 'Housing');
    assert.strictEqual(collection.entries[1].parentCid, 'bafkreia1');
  });

  it('uses current timestamp when publishedAt is not provided', async () => {
    const { createCuratedCollection } = await import('@commonality/nudger-core');

    const before = Math.floor(Date.now() / 1000);
    const collection = createCuratedCollection(
      '0x' + 'cc'.repeat(20),
      'test-stream',
      []
    );
    const after = Math.floor(Date.now() / 1000);

    assert.ok(collection.publishedAt >= before);
    assert.ok(collection.publishedAt <= after);
  });
});
