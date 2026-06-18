import { strict as assert } from 'assert';
import { describe, it } from 'mocha';
import { createExplorerCuratorApp } from '../src/index.js';

const config = {
  nudgerPrivateKey: '0x' + 'aa'.repeat(32),
  ethereumRpcUrl: 'http://localhost:8545',
  indexerUrl: 'http://localhost:3001',
  ipfsApiUrl: 'http://localhost:5001',
  ipfsGatewayUrl: 'http://localhost:8080',
  openRouterApiKey: 'test-key',
  openRouterModel: 'test-model',
  name: 'Test Explorer',
  description: 'Test explorer curator',
  sourceType: 'explorer-curator',
  version: '0.1.0',
  nudgePublicationsContractAddress: '0x' + 'bb'.repeat(20),
  stream: 'fundable-project-explorer',
  curatorIntervalMs: 15 * 60 * 1000,
};

describe('explorer curator app', () => {
  it('runs a curator cycle on demand', async () => {
    let calls = 0;
    const curator = {
      runCuratorCycle: async () => {
        calls += 1;
        return { published: true, entryCount: 2 };
      },
    };

    const app = createExplorerCuratorApp(config as any, ('0x' + 'cc'.repeat(20)) as `0x${string}`, {} as any, curator as any);
    const server = app.listen(0);

    try {
      const address = server.address();
      assert(address && typeof address === 'object');
      const response = await fetch(`http://127.0.0.1:${address.port}/curate`, { method: 'POST' });
      const body = await response.json() as { published: boolean; entryCount: number };

      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(body, { published: true, entryCount: 2 });
      assert.strictEqual(calls, 1);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
