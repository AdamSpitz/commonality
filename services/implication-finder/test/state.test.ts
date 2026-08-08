import assert from 'assert';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unlink } from 'node:fs/promises';
import { loadState, saveState, pairKey } from '../src/state.js';

describe('state', () => {
  const tmpFile = join(tmpdir(), `finder-test-state-${Date.now()}.json`);

  afterEach(async () => {
    try { await unlink(tmpFile); } catch { /* ignore */ }
  });

  it('returns empty state when file does not exist', async () => {
    const state = await loadState('/tmp/nonexistent-finder-state.json');
    assert.strictEqual(state.lastBlockSeen, '0');
    assert.strictEqual(state.evaluatedPairs.length, 0);
  });

  it('round-trips state through save and load', async () => {
    const original = {
      lastBlockSeen: '42',
      evaluatedPairs: ['cidA:cidB', 'cidC:cidD'],
    };

    await saveState(tmpFile, original);
    const loaded = await loadState(tmpFile);

    assert.strictEqual(loaded.lastBlockSeen, '42');
    assert.deepStrictEqual(loaded.evaluatedPairs, ['cidA:cidB', 'cidC:cidD']);
  });
});

describe('pairKey', () => {
  it('creates a colon-separated key', () => {
    assert.strictEqual(pairKey('cidA', 'cidB'), 'cidA:cidB');
  });
});
