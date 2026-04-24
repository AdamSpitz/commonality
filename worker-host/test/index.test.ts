import assert from 'node:assert';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { describe, it } from 'mocha';
import { parseWorkerHostConfig } from '../src/config.js';
import { loadWorkerHostConfigFromEnv } from '../src/envConfig.js';
import { createWorkerHostApp } from '../src/index.js';

function createStubApp(name: string) {
  const app = express();
  app.get('/health', (_req, res) => {
    res.json({ service: name });
  });
  app.get('/quote', (_req, res) => {
    res.json({ service: name, route: 'quote' });
  });
  return app;
}

async function withServer() {
  const app = createWorkerHostApp(
    {
      port: 0,
      workers: [
        {
          name: 'implication-graph-nudger',
          kind: 'implication-graph-nudger',
          routePrefix: '/implication-graph-nudger',
          config: {} as never,
        },
        {
          name: 'bridge-creator',
          kind: 'bridge-creator',
          routePrefix: '/bridge-creator',
          config: {} as never,
        },
      ],
    },
    {
      workerAppFactories: {
        'implication-graph-nudger': () => createStubApp('implication-graph-nudger'),
        'bridge-creator': () => createStubApp('bridge-creator'),
      },
    },
  );

  const server = await new Promise<import('node:http').Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    }),
  };
}

describe('worker host', () => {
  it('mounts routed worker apps under their configured prefixes', async () => {
    const server = await withServer();

    try {
      const implicationResponse = await fetch(`${server.baseUrl}/implication-graph-nudger/quote`);
      assert.strictEqual(implicationResponse.status, 200);
      assert.deepStrictEqual(await implicationResponse.json(), {
        service: 'implication-graph-nudger',
        route: 'quote',
      });

      const bridgeResponse = await fetch(`${server.baseUrl}/bridge-creator/quote`);
      assert.strictEqual(bridgeResponse.status, 200);
      assert.deepStrictEqual(await bridgeResponse.json(), {
        service: 'bridge-creator',
        route: 'quote',
      });

      const unprefixedResponse = await fetch(`${server.baseUrl}/quote`);
      assert.strictEqual(unprefixedResponse.status, 404);
    } finally {
      await server.close();
    }
  });

  it('parses routed worker config and requires a host port', () => {
    const parsed = parseWorkerHostConfig({
      port: 3000,
      workers: [
        {
          name: 'explorer-curator',
          kind: 'explorer-curator',
          routePrefix: '/explorer-curator',
          config: { foo: 'bar' },
        },
      ],
    });

    assert.strictEqual(parsed.port, 3000);
    assert.strictEqual(parsed.workers[0]?.routePrefix, '/explorer-curator');

    assert.throws(
      () => parseWorkerHostConfig({
        workers: [
          {
            name: 'explorer-curator',
            kind: 'explorer-curator',
            routePrefix: '/explorer-curator',
            config: {},
          },
        ],
      }),
      /port is required/,
    );
  });

  it('builds the bundled worker config from environment variables', () => {
    const config = loadWorkerHostConfigFromEnv({
      WORKER_HOST_PORT: '3011',
      ETHEREUM_RPC_URL: 'http://rpc.example',
      INDEXER_URL: 'http://indexer.example',
      IPFS_API: 'http://ipfs-api.example',
      IPFS_GATEWAY: 'http://ipfs-gateway.example',
      IPFS_GATEWAY_URL: 'http://ipfs-gateway-url.example',
      OPENROUTER_API_KEY: 'openrouter-key',
      NUDGE_PUBLICATIONS_CONTRACT_ADDRESS: '0xnudges',
      EVENT_CACHE_URL: 'http://events.example',
      PLATFORM_API_URL: 'http://platform.example',
      BELIEFS_CONTRACT_ADDRESS: '0xbeliefs',
      IMPLICATIONS_CONTRACT_ADDRESS: '0ximplications',
      IMPLICATION_FINDER_ATTESTER_URL: 'http://attester.example/implication-attester',
      IMPLICATION_FINDER_ATTESTER_FINDER_KEY: 'implication-finder-key',
      CONTENT_FINDER_ATTESTER_URL: 'http://attester.example/content-attester',
      CONTENT_FINDER_ATTESTER_FINDER_KEY: 'content-finder-key',
      IMPLICATION_GRAPH_NUDGER_PRIVATE_KEY: '0xgraph',
      BRIDGE_CREATOR_PRIVATE_KEY: '0xbridge',
      BRIDGE_CREATOR_COMMONALITY_STATEMENTS: 'One, Two',
      EXPLORER_CURATOR_PRIVATE_KEY: '0xexplorer',
      EXPLORER_CURATOR_STREAM: 'fundable-project-explorer',
    });

    assert.strictEqual(config.port, 3011);
    assert.strictEqual(config.workers.length, 5);
    assert.strictEqual(config.workers[0]?.name, 'implication-finder');
    assert.strictEqual(config.workers[0]?.config.attesterUrl, 'http://attester.example/implication-attester');
    assert.strictEqual(config.workers[2]?.routePrefix, '/implication-graph-nudger');
    assert.deepStrictEqual(config.workers[3]?.config.commonalityStatements, ['One', 'Two']);
    assert.strictEqual(config.workers[4]?.routePrefix, '/explorer-curator');
  });
});
