import assert from 'node:assert';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer, type Server } from 'node:http';
import { createBridgeCreatorApp, loadConfigFromEnv } from '../src/index.js';

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No server address');
  return `http://127.0.0.1:${address.port}`;
}

describe('bridge creator browser HTTP access', () => {
  it('serves featured anchors cross-origin and answers preflight', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'bridge-cors-'));
    const anchors = join(dir, 'anchors.json');
    writeFileSync(anchors, JSON.stringify({ anchors: [] }));
    const config = loadConfigFromEnv({
      BRIDGE_CREATOR_PRIVATE_KEY: `0x${'11'.repeat(32)}`,
      ETHEREUM_RPC_URL: 'http://rpc.example',
      OPENROUTER_API_KEY: 'test',
      NUDGE_PUBLICATIONS_CONTRACT_ADDRESS: `0x${'22'.repeat(20)}`,
      BRIDGE_CREATOR_ANCHOR_STORE_PATH: anchors,
      BRIDGE_CREATOR_CORS_ORIGINS: 'https://cause.example',
    });
    const server = createServer(createBridgeCreatorApp(config, `0x${'33'.repeat(20)}`));
    const baseUrl = await listen(server);
    try {
      const response = await fetch(`${baseUrl}/anchors?featured=true`, { headers: { Origin: 'https://cause.example' } });
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.headers.get('access-control-allow-origin'), 'https://cause.example');
      assert.deepStrictEqual(await response.json(), { anchors: [] });
      const preflight = await fetch(`${baseUrl}/anchors`, { method: 'OPTIONS', headers: { Origin: 'https://cause.example' } });
      assert.strictEqual(preflight.status, 204);
      assert.match(preflight.headers.get('access-control-allow-methods') ?? '', /GET/);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
