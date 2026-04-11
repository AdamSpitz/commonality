import assert from 'node:assert';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadJsonState, saveJsonState } from '../src/state.js';

describe('finder-core state helpers', () => {
  it('returns the empty state when the file does not exist', async () => {
    const state = await loadJsonState(
      '/tmp/nonexistent-finder-core-state.json',
      (value) => value as { count: number },
      () => ({ count: 0 }),
    );

    assert.deepStrictEqual(state, { count: 0 });
  });

  it('round-trips JSON state through disk', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'finder-core-state-'));
    const filePath = join(dir, 'state.json');

    await saveJsonState(filePath, { count: 2, names: ['a', 'b'] });

    const raw = await readFile(filePath, 'utf-8');
    assert.match(raw, /"count": 2/);

    const state = await loadJsonState(
      filePath,
      (value) => value as { count: number; names: string[] },
      () => ({ count: 0, names: [] }),
    );

    assert.deepStrictEqual(state, { count: 2, names: ['a', 'b'] });
  });
});
