import assert from 'node:assert';
import { join } from 'node:path';
import { getActiveAnchors, loadAnchorStoreFile, normalizeAnchorStoreFile } from '../src/anchors.js';

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
