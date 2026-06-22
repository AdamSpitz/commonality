import assert from 'node:assert';
import { join } from 'node:path';
import { getActiveAnchors, getFeaturedAnchors, loadAnchorStoreFile, normalizeAnchorStoreFile } from '../src/anchors.js';

describe('bridge creator anchors', () => {
  it('loads the curated seed anchors as active clusters with common-ground statements', () => {
    const store = loadAnchorStoreFile(join(process.cwd(), 'data', 'seed-anchors.json'));
    const activeAnchors = getActiveAnchors(store);

    assert.strictEqual(activeAnchors.length, 12);
    assert.deepStrictEqual(
      [...new Set(activeAnchors.map((anchor) => anchor.cluster_id))].sort(),
      ['abortion-v1', 'drug-policy-v1', 'gun-policy-v1', 'immigration-v1'],
    );

    for (const clusterId of new Set(activeAnchors.map((anchor) => anchor.cluster_id))) {
      const roles = activeAnchors
        .filter((anchor) => anchor.cluster_id === clusterId)
        .map((anchor) => anchor.role)
        .sort();
      assert.deepStrictEqual(roles, ['common-ground', 'moderate-left', 'moderate-right']);
    }
  });

  it('rejects duplicate anchor ids', () => {
    assert.throws(
      () => normalizeAnchorStoreFile({
        anchors: [
          makeAnchor({ id: 'duplicate', role: 'common-ground' }),
          makeAnchor({ id: 'duplicate', role: 'moderate-left' }),
        ],
      }),
      /Duplicate anchor id: duplicate/,
    );
  });

  it('keeps proposed anchors out of the active set', () => {
    const store = normalizeAnchorStoreFile({
      anchors: [
        makeAnchor({ id: 'active', status: 'active' }),
        makeAnchor({ id: 'proposed', status: 'proposed' }),
      ],
    });

    assert.deepStrictEqual(getActiveAnchors(store).map((anchor) => anchor.id), ['active']);
  });

  it('defaults a missing featured flag to false and rejects non-boolean featured', () => {
    const store = normalizeAnchorStoreFile({ anchors: [makeAnchor({ id: 'no-featured' })] });
    assert.strictEqual(store.anchors[0].featured, false);

    assert.throws(
      () => normalizeAnchorStoreFile({ anchors: [makeAnchor({ featured: 'yes' })] }),
      /must be a boolean: featured/,
    );
  });

  it('returns only active and featured anchors from getFeaturedAnchors', () => {
    const store = normalizeAnchorStoreFile({
      anchors: [
        makeAnchor({ id: 'active-featured', status: 'active', featured: true }),
        makeAnchor({ id: 'active-plain', status: 'active', featured: false }),
        makeAnchor({ id: 'retired-featured', status: 'retired', featured: true }),
        makeAnchor({ id: 'proposed-featured', status: 'proposed', featured: true }),
      ],
    });

    assert.deepStrictEqual(getFeaturedAnchors(store).map((anchor) => anchor.id), ['active-featured']);
  });

  it('ships the seed anchors as featured so the public page renders', () => {
    const store = loadAnchorStoreFile(join(process.cwd(), 'data', 'seed-anchors.json'));
    assert.ok(getActiveAnchors(store).every((anchor) => anchor.featured));
  });

  it('links every seed common-ground bridge to its seeded Tally statement', () => {
    const store = loadAnchorStoreFile(join(process.cwd(), 'data', 'seed-anchors.json'));
    const commonGroundAnchors = getActiveAnchors(store).filter((anchor) => anchor.role === 'common-ground');

    assert.deepStrictEqual(
      commonGroundAnchors.map((anchor) => [anchor.topic_tag, anchor.tally_cid]),
      [
        ['abortion', 'bafybeieapyat4uy4rfqmeznaafl3tn64enzgycbgaqgmlm23q4bt2r3c2q'],
        ['immigration', 'bafybeiehim7wsgd35doqihxyzawz2zt4zegdhntbw2mmkrh7wcg2oj5c6m'],
        ['gun-policy', 'bafybeieazweue53u6uxqsuyd6e4iwackl3d5grwpkhagv4zs3seyxhth7q'],
        ['drug-policy', 'bafybeici37535ecl4byld75o7bs7u7k3dttcf2oobfeoq23zbta7ipa4sm'],
      ],
    );
  });
});

function makeAnchor(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'anchor-id',
    cluster_id: 'cluster-id',
    role: 'common-ground',
    text: 'A compromise statement.',
    tally_cid: null,
    topic_tag: 'topic',
    rationale: 'Test fixture.',
    status: 'active',
    created_at: '2026-05-21T00:00:00.000Z',
    last_reviewed_at: '2026-05-21T00:00:00.000Z',
    ...overrides,
  };
}
