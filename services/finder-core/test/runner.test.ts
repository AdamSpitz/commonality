import assert from 'node:assert';
import { describe, it } from 'mocha';
import { runPollingFinder } from '../src/runner.js';

describe('runPollingFinder', () => {
  it('stops cleanly between polling cycles', async () => {
    let runs = 0;
    const handle = runPollingFinder({
      serviceName: 'Test Finder',
      pollIntervalMs: 50,
      runOnce: async () => {
        runs++;
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    await handle.stop();
    const runsAtStop = runs;

    await new Promise((resolve) => setTimeout(resolve, 80));

    assert.ok(runsAtStop >= 1);
    assert.strictEqual(runs, runsAtStop);
  });
});
