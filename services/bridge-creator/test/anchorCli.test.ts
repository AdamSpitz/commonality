import assert from 'node:assert';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseAnchorCliArgs, runAnchorCli } from '../src/anchorCli.js';
import { normalizeAnchorStoreFile } from '../src/anchors.js';

describe('bridge creator anchor CLI', () => {
  let tempDir: string;
  let storePath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'bridge-anchor-cli-'));
    storePath = join(tempDir, 'anchors.json');
    writeFileSync(storePath, `${JSON.stringify({ anchors: [makeAnchor({ id: 'draft' }), makeAnchor({ id: 'active', status: 'active' })] }, null, 2)}\n`);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('lists proposed anchors without changing the store', () => {
    const result = runAnchorCli(['--store', storePath, 'list-proposed']);

    assert.strictEqual(result.storeChanged, false);
    assert.match(result.message, /draft \[topic\/common-ground\]: A compromise statement\./);
    assert.strictEqual(JSON.parse(readFileSync(storePath, 'utf8')).anchors[0].status, 'proposed');
  });

  it('approves proposed anchors and updates review timestamp', () => {
    const before = JSON.parse(readFileSync(storePath, 'utf8')).anchors[0].last_reviewed_at;
    const result = runAnchorCli(['--store', storePath, 'approve', 'draft']);
    const store = normalizeAnchorStoreFile(JSON.parse(readFileSync(storePath, 'utf8')));

    assert.strictEqual(result.storeChanged, true);
    assert.strictEqual(store.anchors.find((anchor) => anchor.id === 'draft')?.status, 'active');
    assert.notStrictEqual(store.anchors.find((anchor) => anchor.id === 'draft')?.last_reviewed_at, before);
  });

  it('retires anchors', () => {
    runAnchorCli(['--store', storePath, 'retire', 'active']);
    const store = normalizeAnchorStoreFile(JSON.parse(readFileSync(storePath, 'utf8')));

    assert.strictEqual(store.anchors.find((anchor) => anchor.id === 'active')?.status, 'retired');
  });

  it('deletes anchors', () => {
    runAnchorCli(['--store', storePath, 'delete', 'draft']);
    const store = normalizeAnchorStoreFile(JSON.parse(readFileSync(storePath, 'utf8')));

    assert.deepStrictEqual(store.anchors.map((anchor) => anchor.id), ['active']);
  });

  it('rejects missing anchor ids for mutating commands', () => {
    assert.throws(() => parseAnchorCliArgs(['retire']), /retire requires at least one anchor id/);
  });

  it('features and unfeatures every anchor in a cluster and bumps review timestamps', () => {
    writeFileSync(storePath, `${JSON.stringify({ anchors: [
      makeAnchor({ id: 'l', role: 'moderate-left', cluster_id: 'c1', status: 'active' }),
      makeAnchor({ id: 'r', role: 'moderate-right', cluster_id: 'c1', status: 'active' }),
      makeAnchor({ id: 'cg', role: 'common-ground', cluster_id: 'c1', status: 'active' }),
      makeAnchor({ id: 'other', cluster_id: 'c2', status: 'active' }),
    ] }, null, 2)}\n`);

    const result = runAnchorCli(['--store', storePath, 'feature', 'c1']);
    assert.strictEqual(result.storeChanged, true);
    let store = normalizeAnchorStoreFile(JSON.parse(readFileSync(storePath, 'utf8')));
    assert.deepStrictEqual(store.anchors.filter((a) => a.featured).map((a) => a.id), ['l', 'r', 'cg']);
    assert.notStrictEqual(store.anchors.find((a) => a.id === 'l')?.last_reviewed_at, '2026-05-21T00:00:00.000Z');

    runAnchorCli(['--store', storePath, 'unfeature', 'c1']);
    store = normalizeAnchorStoreFile(JSON.parse(readFileSync(storePath, 'utf8')));
    assert.deepStrictEqual(store.anchors.filter((a) => a.featured).map((a) => a.id), []);
  });

  it('rejects featuring an unknown cluster id', () => {
    assert.throws(() => runAnchorCli(['--store', storePath, 'feature', 'nope']), /Unknown cluster id\(s\): nope/);
    assert.throws(() => parseAnchorCliArgs(['feature']), /feature requires at least one cluster id/);
  });

  it('warns but still features an incomplete cluster', () => {
    writeFileSync(storePath, `${JSON.stringify({ anchors: [
      makeAnchor({ id: 'l', role: 'moderate-left', cluster_id: 'c1', status: 'active' }),
      makeAnchor({ id: 'cg', role: 'common-ground', cluster_id: 'c1', status: 'active' }),
    ] }, null, 2)}\n`);

    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (msg?: unknown) => { warnings.push(String(msg)); };
    try {
      runAnchorCli(['--store', storePath, 'feature', 'c1']);
    } finally {
      console.warn = originalWarn;
    }

    assert.ok(warnings.some((w) => /missing role\(s\): moderate-right/.test(w)));
    const store = normalizeAnchorStoreFile(JSON.parse(readFileSync(storePath, 'utf8')));
    assert.ok(store.anchors.every((a) => a.featured));
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
    status: 'proposed',
    created_at: '2026-05-21T00:00:00.000Z',
    last_reviewed_at: '2026-05-21T00:00:00.000Z',
    ...overrides,
  };
}
